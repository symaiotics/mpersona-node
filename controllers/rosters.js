
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const Roster = require('../models/Roster');

const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');

// const { Configuration, OpenAIApi } = require("openai");
// const configuration = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
// });
// const openai = new OpenAIApi(configuration);

// Gets the Rosters which are public 
exports.get = async function (req, res, next) {
    try {
        let query = { status: 'active' };
        var username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (req.tokenDecoded) {
            query = {
                status: 'active',
                $or: [
                    { owners: req.tokenDecoded.username },
                    { editors: req.tokenDecoded.username },
                    { viewers: req.tokenDecoded.username },
                ]
            };
        }

        const aggregation = [
            { $match: query },
            // Add isEditor, isViewer, isOwner, isCreatedBy fields
            {
                $addFields: {
                    editorsArray: { $ifNull: ["$editors", []] },
                    viewersArray: { $ifNull: ["$viewers", []] },
                    ownersArray: { $ifNull: ["$owners", []] }
                }
            },
            {
                $addFields: {
                    isEditor: { $in: [username, "$editorsArray"] },
                    isViewer: { $in: [username, "$viewersArray"] },
                    isOwner: { $in: [username, "$ownersArray"] },
                    isCreatedBy: { $eq: [username, "$createdBy"] }
                }
            },

            // Join with Personas collection
            {
                $lookup: {
                    from: "personas",
                    let: { personaUuidList: { $ifNull: ["$personaUuids", []] } },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $cond: {
                                        if: { $ne: ["$$personaUuidList", []] }, // Check if personaUuidList is not empty
                                        then: { $in: ["$uuid", "$$personaUuidList"] }, // If not empty, check if uuid is in personaUuidList
                                        else: false // If empty, no documents will match this condition
                                    }
                                }
                            }
                        }
                    ],
                    as: "personas"
                }
            }

            ,

            // Project the desired fields and counts
            {
                $project: {
                    uuid: 1,
                    name: 1,
                    description: 1,
                    context: 1,
                    owners: 1,
                    editors: 1,
                    viewers: 1,
                    isEditor: 1,
                    isViewer: 1,
                    isOwner: 1,
                    isCreatedBy: 1,
                    viewerLink: 1,
                    editorLink: 1,
                    personas: 1,
                    url:1,
                    personasCount: { $size: "$personas" },
                }
            }
        ];

        // // Only add the $project stage if the user is not an admin
        // if (!roles.includes('admin')) {
        //     aggregation.push({
        //         $project: {
        //             editors: 0,
        //             viewers: 0,
        //             owners: 0,
        //         }
        //     });
        // }



        const results = await Roster.aggregate(aggregation);

        res.status(201).send({ message: "Here are all the active rosters", payload: results });
    } catch (error) {
        console.log("Error", error)
        res.status(400).send(error);
    }
};

// exports.getFromUuid = async function (req, res, next) {
//     try {
//         var rosterUuid = req.body.rosterUuid || req.query.rosterUuid || "";
//         let query = { status: 'active', uuid:rosterUuid };
//         const results = await Roster.findOne(query);
//         res.status(201).send({ message: "Here is the roster requested", payload: results });
//     } catch (error) {
//         console.log("Error", error)
//         res.status(400).send(error);
//     }
// };

exports.getFromUuid = async function (req, res, next) {
    try {
        var rosterUuid = req.body.rosterUuid || req.query.rosterUuid || "";
        let query = { status: 'active', uuid: rosterUuid };

        const aggregation = [
            { $match: query },
            {
                $lookup: {
                    from: "personas",
                    let: { personaUuidList: "$personaUuids" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$uuid", "$$personaUuidList"]
                                }
                            }
                        }
                    ],
                    as: "personas"
                }
            },
            {
                $project: {
                    uuid: 1,
                    name: 1,
                    description: 1,
                    context: 1,
                    owners: 1,
                    editors: 1,
                    viewers: 1,
                    personaUuids: 1,
                    personas: 1,
                    url:1,
                }
            }
        ];

        const results = await Roster.aggregate(aggregation).exec();

        if (results && results.length > 0) {
            const roster = results[0];
            // Sort personas based on the order of UUIDs in the `personaUuids` array
            const sortedPersonas = roster.personaUuids.map(uuid => 
                roster.personas.find(persona => persona.uuid === uuid)
            ).filter(persona => persona !== undefined); // Filter out any undefined results

            roster.personas = sortedPersonas;
            res.status(201).send({ message: "Here is the roster requested", payload: roster });
        } else {
            res.status(404).send({ message: "Roster not found" });
        }
    } catch (error) {
        console.error("Error", error);
        res.status(400).send(error);
    }
};
exports.create = async function (req, res, next) {
    try {
        // Combine rosters from body and query, ensuring no duplicates if necessary
        var rostersFromBody = Array.isArray(req.body.rosters) ? req.body.rosters : [];
        var rostersFromQuery = Array.isArray(req.query.rosters) ? req.query.rosters : [];
        var rosters = [...new Set([...rostersFromBody, ...rostersFromQuery])];

        // Process each roster item
        rosters.forEach((item) => {
            if (req.tokenDecoded) {
                item.owners = [req.tokenDecoded.username];
                item.viewers = req.tokenDecoded.viewers ? [req.tokenDecoded.viewers] : [];
                item.editors = [req.tokenDecoded.username];
                item.createdBy = req.tokenDecoded.username;
            }
            item.active = true; // assuming 'active' should be a boolean
        });

        // Insert into database
        var results = await Roster.insertMany(rosters);
        console.log("Created rosters", results);

        // Send back a sanitized version of results if necessary
        res.status(201).send({ message: "Created all the identified rosters", payload: results });
    } catch (error) {
        console.error(error);
        res.status(400).send({ error: 'There was an error creating the rosters.' });
    }
};

exports.update = async function (req, res, next) {
    try {
        var rostersFromBody = Array.isArray(req.body.rosters) ? req.body.rosters : [];
        var rostersFromQuery = Array.isArray(req.query.rosters) ? req.query.rosters : [];
        var rosters = [...new Set([...rostersFromBody, ...rostersFromQuery])];

        // Map over rosters and update them in parallel
        var updatePromises = rosters.map(async (roster) => {
            const { _id, ...updateData } = roster;
            var updateParams = {
                _id: _id,
                $or: [
                    { owners: req.tokenDecoded.username },
                    { editors: req.tokenDecoded.username },
                ]
            };
            return await Roster.findOneAndUpdate(
                updateParams, { $set: updateData }, { new: true }
            );
        });

        // Wait for all the updates to complete
        var updated = await Promise.all(updatePromises);

        // Filter out null results in case some updates didn't go through
        updated = updated.filter(result => result !== null);

        res.status(200).send({ message: "Here are your updated rosters", payload: updated });
    } catch (error) {
        console.error(error);
        res.status(400).send({ error: 'There was an error updating the rosters.' });
    }
};


exports.addLink = async function (req, res, next) {
    try {
        const username = req.tokenDecoded?.username;
        const { rosterUuid, rosterLink, linkType } = req.body;

        if (!username) {
            return res.status(400).send({ message: "Username not found in token." });
        }

        if (!rosterUuid || !rosterLink || !['editorLink', 'viewerLink'].includes(linkType)) {
            return res.status(400).send({ message: "Missing or invalid parameters." });
        }

        const update = { [linkType]: rosterLink };
        const query = {
            uuid: rosterUuid,
            $or: [{ editors: username }, { owners: username }]
        };

        const updatedRoster = await Roster.updateOne(query, update);

        if (updatedRoster.nModified === 0) {
            return res.status(403).send({ message: "No permissions to update or roster not found." });
        }

        res.status(200).send({
            message: "Link added to roster successfully.",
            payload: updatedRoster
        });
    } catch (error) {
        res.status(500).send({ message: "An error occurred while adding the link.", error: error.message });
    }
};


// Gets all the unique details from the link provided
exports.linkDetails = async function (req, res, next) {
    try {

        var link = req.body.link || req.query.link || "";
        var roster = await Roster.findOne({ $or: [{ editorLink: link }, { viewerLink: link }] })
            .select('name description editorLink viewerLink');

        if (roster) {
            roster = roster.toObject();
            roster.isEditor = roster.editorLink === link;
            roster.isViewer = roster.viewerLink === link;
            delete roster.editorLink;
            delete roster.viewerLink;

            res.status(200).send({
                message: "Here is the roster",
                payload: roster
            });
        } else {
            res.status(404).send({ message: "Roster not found" });
        }
    } catch (error) {
        console.log("Error", error)
        res.status(400).send(error);
    }
};

//accept Roster from the link
exports.acceptLink = async function (req, res, next) {
    try {
        var link = req.body.link || req.query.link || "";
        var username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (!username) {
            return res.status(400).send({ message: "Username not found in token" });
        }

        var roster = await Roster.findOne({ $or: [{ editorLink: link }, { viewerLink: link }] })
            .select('editorLink viewerLink');

        if (!roster) {
            return res.status(404).send({ message: "Roster not found" });
        }

        var update = {};

        if (roster.editorLink === link) {
            update.$addToSet = { editors: username };
        } else if (roster.viewerLink === link) {
            update.$addToSet = { viewers: username };
        }

        await Roster.updateOne({ _id: roster._id }, update);

        res.status(200).send({
            message: "Roster link accepted"
        });

    } catch (error) {
        console.log("Error", error)

        res.status(400).send(error);
    }
};

