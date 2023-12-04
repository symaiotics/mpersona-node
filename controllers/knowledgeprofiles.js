
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const KnowledgeProfile = require('../models/KnowledgeProfile');

const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');


// Gets the Knowledge Profiles which are public 
exports.getKnowledgeProfiles = async function (req, res, next) {
    try {
        let query = { status: 'active', createdBy: 'public' };
        var username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (req.tokenDecoded) {
            query = {
                status: 'active',
                $or: [
                    { owners: req.tokenDecoded.username },
                    { editors: req.tokenDecoded.username },
                    { viewers: req.tokenDecoded.username },
                    { createdBy: 'public' }
                ]
            };
        }

        const aggregation = [
            { $match: query },
            // Add isEditor, isViewer, isOwner, isCreatedBy fields
            {
                $addFields: {
                    isEditor: username !== null ? { $in: [username, { $ifNull: ["$editors", []] }] } : false,
                    isViewer: username !== null ? { $in: [username, { $ifNull: ["$viewers", []] }] } : false,
                    isOwner: username !== null ? { $in: [username, { $ifNull: ["$owners", []] }] } : false,
                    isCreatedBy: username !== null ? { $eq: [username, "$createdBy"] } : false,
                }
            },
            // Join with Files collection
            {
                $lookup: {
                    from: "files",
                    localField: "uuid",
                    foreignField: "knowledgeProfileUuid",
                    as: "files"
                }
            },
            // Join with Facts collection
            {
                $lookup: {
                    from: "facts",
                    localField: "uuid",
                    foreignField: "knowledgeProfileUuid",
                    as: "facts"
                }
            },
            // Project the desired fields and counts
            {
                $project: {
                    uuid: 1,
                    name: 1,
                    description: 1,
                    context: 1,
                    isEditor: 1,
                    isViewer: 1,
                    isOwner: 1,
                    isCreatedBy: 1,
                    viewerLink:1, 
                    editorLink:1,
                    filesCount: { $size: "$files" },
                    factsCount: { $size: "$facts" }
                }
            }
        ];

        const results = await KnowledgeProfile.aggregate(aggregation);

        res.status(201).send({ message: "Here are all the active knowledge profiles", payload: results });
    } catch (error) {
        console.log("Error", error)
        res.status(400).send(error);
    }
};

exports.createKnowledgeProfiles = async function (req, res, next) {
    try {
        var knowledgeProfiles = req.body.knowledgeProfiles || req.query.knowledgeProfiles || [];
        if (!Array.isArray(knowledgeProfiles)) knowledgeProfiles = [knowledgeProfiles];

        //Set the person who created this knowledge profile, if applicable
        knowledgeProfiles.forEach((kp) => {
            if (req.tokenDecoded) {
                kp.owners = [req.tokenDecoded.username];
                kp.viewers = [req.tokenDecoded.viewers];
                kp.editors = [req.tokenDecoded.username];
                kp.createdBy = req.tokenDecoded.username;
            }
            kp.active = "active"
        })

        var results = await KnowledgeProfile.insertMany(knowledgeProfiles)
        console.log("Create Knowledge Profile", results)
        res.status(201).send({ message: "Created all the identified knowledge profiles", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};


exports.updateKnowledgeProfiles = async function (req, res, next) {
    try {
        var knowledgeProfiles = req.body.knowledgeProfiles || req.query.knowledgeProfiles || [];
        if (!Array.isArray(knowledgeProfiles)) knowledgeProfiles = [knowledgeProfiles];
        var updatedKnowledgeProfiles = [];
        knowledgeProfiles.forEach(async (kp) => {
            const { _id, ...updateData } = kp;
            var updateParams =
            {
                _id: _id,
                $or: [
                    { owners: req.tokenDecoded.username },
                    { editors: req.tokenDecoded.username },
                ]

            };
            var results = await KnowledgeProfile.findOneAndUpdate(
                updateParams, { $set: updateData }, { new: true }
            )
            updatedKnowledgeProfiles.push((results))
        })

        res.status(201).send({ message: "Here are your updated knowledge profiles", payload: updatedKnowledgeProfiles });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.addLink = async function (req, res, next) {
    try {

        var username = req.tokenDecoded ? req.tokenDecoded.username : null;

        var knowledgeProfileUuid = req.body.knowledgeProfileUuid || req.query.knowledgeProfileUuid || "";
        var knowledgeProfileLink = req.body.knowledgeProfileLink || req.query.knowledgeProfileLink || "";
        var linkType = req.body.linkType || req.query.linkType || "";

        if (!username) {
            return res.status(400).send({ message: "Username not found in token" });
        }

        var update = {};

        if (linkType === 'editorLink') {
            update.editorLink = knowledgeProfileLink;
        } else if (linkType === 'viewerLink') {
            update.viewerLink = knowledgeProfileLink;
        } else {
            return res.status(400).send({ message: "Invalid linkType" });
        }

        var query = {
            uuid: knowledgeProfileUuid,
            $or: [
                { editors: username },
                { owners: username }
            ]
        };

        var updatedKnowledgeProfile = await KnowledgeProfile.updateOne(query, update);
        console.log(updatedKnowledgeProfile)
        if (updatedKnowledgeProfile.nModified === 0) {
            return res.status(400).send({ message: "Unable to update. Ensure you have the right permissions." });
        }

        res.status(201).send({
            message: "Link Added to knowledgeProfile",
            payload: updatedKnowledgeProfile
        });

    } catch (error) {
        console.log("Error", error)
        res.status(400).send(error);
    }
};

// Gets all the unique details from the link provided
exports.linkDetails = async function (req, res, next) {
    try {

        var link = req.body.link || req.query.link || "";
        var knowledgeProfile = await KnowledgeProfile.findOne({ $or: [{ editorLink: link }, { viewerLink: link }] })
            .select('name description editorLink viewerLink');

        if (knowledgeProfile) {
            knowledgeProfile = knowledgeProfile.toObject();
            knowledgeProfile.isEditor = knowledgeProfile.editorLink === link;
            knowledgeProfile.isViewer = knowledgeProfile.viewerLink === link;
            delete knowledgeProfile.editorLink;
            delete knowledgeProfile.viewerLink;

            res.status(201).send({
                message: "Here is the knowledgeProfile",
                payload: knowledgeProfile
            });
        } else {
            res.status(404).send({ message: "Knowledge Profile not found" });
        }
    } catch (error) {
        console.log("Error", error)
        res.status(400).send(error);
    }
};

//accept knowledge profile from the link
exports.acceptLink = async function (req, res, next) {
    try {
        var link = req.body.link || req.query.link || "";
        var username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (!username) {
            return res.status(400).send({ message: "Username not found in token" });
        }

        var knowledgeProfile = await KnowledgeProfile.findOne({ $or: [{ editorLink: link }, { viewerLink: link }] })
            .select('editorLink viewerLink');

        if (!knowledgeProfile) {
            return res.status(404).send({ message: "Knowledge Profile not found" });
        }

        var update = {};

        if (knowledgeProfile.editorLink === link) {
            update.$addToSet = { editors: username };
        } else if (knowledgeProfile.viewerLink === link) {
            update.$addToSet = { viewers: username };
        }

        await KnowledgeProfile.updateOne({ _id: knowledgeProfile._id }, update);

        res.status(201).send({
            message: "Knowledge Profile link accepted"
        });

    } catch (error) {
        console.log("Error", error)

        res.status(400).send(error);
    }
};

