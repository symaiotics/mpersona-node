//Basic application requirements
// const express = require('express');
// const mongoose = require('mongoose');
// const axios = require('axios');

const Fact = require('../models/Fact');

// Gets all the user's facts
exports.getFacts = async function (req, res, next) {
    try {
        // Get the public
        var query = { status: 'active', createdBy: 'public' };
        var username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (username) {
            query = {
                status: 'active',
                $or: [
                    { editors: username },
                    { viewers: username },
                    { owners: username },  // Added owners field here
                    { createdBy: username },
                    { createdBy: 'public' }
                ]
            }
        }

        var aggregation = [
            { $match: query },
            {
                $addFields: {
                    isEditor: username !== null ? { $in: [username, { $ifNull: ["$editors", []] }] } : false,
                    isViewer: username !== null ? { $in: [username, { $ifNull: ["$viewers", []] }] } : false,
                    isOwner: username !== null ? { $in: [username, { $ifNull: ["$owners", []] }] } : false,
                    isCreatedBy: username !== null ? { $eq: [username, "$createdBy"] } : false,
                }
            },
            {
                $project: {
                    editors: 0,
                    viewers: 0,
                    owners: 0,
                    createdBy: 0
                }
            }
        ];

        var facts = await Fact.aggregate(aggregation);
        if (facts.length > 0) {
            res.status(200).send({ message: "Here are all the active facts", payload: facts });
        } else {
            res.status(404).send({ message: "No active facts found", payload: [] });
        }
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
};

exports.createFacts = async function (req, res, next) {
    try {
        var facts = req.body.facts || req.query.facts || [];
        if (!Array.isArray(facts)) facts = [facts];
        console.log("Creating facts", facts)
        //Set the person who created this persona, if applicable
        facts.forEach((fact) => {
            if (req.tokenDecoded) {
                fact.createdBy = req.tokenDecoded.username;
                fact.editors = [req.tokenDecoded.username];
                fact.owners = [req.tokenDecoded.username];
                fact.viewers = [req.tokenDecoded.username];
            }
        })

        var results = await Fact.insertMany(facts)
        //Get the first persona inserted and return it;

        res.status(201).send({ message: "Created all the identified facts", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};


exports.searchFacts = async function (req, res, next) {
    try {
        const searchString = req.body.searchString || req.query.searchString || null;
        const knowledgeProfileUuids = req.body.knowledgeProfileUuids || req.query.knowledgeProfileUuids || null;

        if (!searchString) {
            return res.status(400).json({ error: 'searchString parameter is required' });
        }

        let results = await exports.getFactsFromKnowledgeProfiles(searchString, knowledgeProfileUuids)

        res.status(200).send({ message: "Search Results", payload: results });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


exports.getFactsFromKnowledgeProfiles = async function (searchString, knowledgeProfileUuids) {

    // Initialize the query object with the text search condition
    var query = { $text: { $search: searchString } };

    // If knowledgeProfileUuids are provided, add an $in condition to the query
    if (knowledgeProfileUuids && Array.isArray(knowledgeProfileUuids) && knowledgeProfileUuids.length > 0) {
        query.knowledgeProfileUuid = { $in: knowledgeProfileUuids };
    }

    const results = await Fact.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });

    return results;
}


//Create text indexes automatically
//Remove for V2.
// createTextIndex()

async function createTextIndex() {
    try {
        // Retrieve the existing indexes for the collection
        const indexes = await Fact.listIndexes();

        // Define the index you want to create
        const indexDefinition = {
            keywords: 'text',
            facts: 'text',
            questions: 'text',
            "knowledgeProfile.context": 'text',
            "file.context": 'text',
        };
        const indexOptions = {
            name: 'textIndex', // name of the index, optional but recommended
            weights: {
                keywords: 5,
                facts: 5,
                questions: 3,
                "knowledgeProfile.context": 1,
                "file.context": 1,
            },
        };

        // Check if the index already exists
        const indexExists = indexes.some(index => {
            return index.name === indexOptions.name;
        });

        // If the index does not exist, create it
        if (!indexExists) {
            await Fact.collection.createIndex(indexDefinition, indexOptions);
            console.log('Text index created successfully.');
        } else {
            console.log('Text index already exists.');
        }
    } catch (err) {
        console.error('Error creating text index:', err);
    }
}


exports.getFactsByKnowledgeProfileUuids = async function (req, res, next) {
    try {
        const knowledgeProfileUuids = req.body.knowledgeProfileUuids || req.query.knowledgeProfileUuids || null;
        var username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (!knowledgeProfileUuids) {
            return res.status(400).send({ message: "knowledgeProfileUuids parameter is required" });
        }

        var facts = exports.findFacts(username, knowledgeProfileUuids)
        if (facts.length > 0) {
            let jsonl = exports.formatFactsToJsonl(facts);
            res.status(200).send({ message: "Here is the jsonl of these knowledge profiles", payload: jsonl });
        } else {
            res.status(404).send({ message: "No active facts found", payload: [] });
        }
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
};



exports.findFacts = async function (username, knowledgeProfileUuids) {
    try {
        // Ensure knowledgeProfileUuids is an array
        const uuidArray = Array.isArray(knowledgeProfileUuids) ? knowledgeProfileUuids : [knowledgeProfileUuids];

        let query = {};
        if (username) {
            query = {
                knowledgeProfileUuid: { $in: uuidArray },
                status: 'active',
                $or: [
                    { owners: username },
                    { editors: username },
                    { viewers: username },
                ]
            };
        } else {
            query = {
                knowledgeProfileUuid: { $in: uuidArray },
                status: 'active'
            };
        }

        var facts = await Fact.find(query);
        return facts;
    } catch (error) {
        console.log(error);
        return [];
    }
};



exports.formatFactsToJsonl = function (facts, systemPrompt) {
    let jsonlLines = [];

    for (let fact of facts) {
        for (let question of fact.questions) {
            const jsonlLine = {
                messages: [

                    { role: "user", content: question },
                    { role: "assistant", content: fact.fact }
                ]
            };
            if (systemPrompt) jsonlLine.messages.unshift({ role: "system", content: systemPrompt }) // add system prompt  prompt
            jsonlLines.push(JSON.stringify(jsonlLine));
        }
    }

    return jsonlLines.join('\n');
}
