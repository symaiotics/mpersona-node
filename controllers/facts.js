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
