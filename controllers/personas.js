
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const Persona = require('../models/Persona');

const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerName = 'images';
const containerClient = blobServiceClient.getContainerClient(containerName);

const upload = multer({ storage: multer.memoryStorage() });


const factController = require('./facts');
const { Readable } = require('stream');
const FormData = require('form-data');
const { openai } = require("../config/app.js");
const { toFile } = require('openai');

// Returns the personas
exports.getPersonas = async function (req, res, next) {
    try {
        // Get the public
        var viewAll = req.body.viewAll || req.query.viewAll || false;
        var username = req?.tokenDecoded?.username || null;
        var roles = req?.tokenDecoded?.roles || [];
 
        const baseQuery = { status: 'active' };
        var query;

        if (roles.includes('admin') && viewAll) {
            // If roles include 'admin', get all active documents
            query = baseQuery;
        } else if (username) {
            // If username is provided, adjust the query to filter by ownership, editorship, viewership, or published status
            query = {
                ...baseQuery,
                $or: [
                    { owners: username },
                    { editors: username },
                    { viewers: username },
                    { publishStatus: 'published' }
                ]
            };
        } else {
            // Default query if no username or admin role
            query = {
                ...baseQuery,
                publishStatus: 'published'
            };
        }

        var aggregation = [
            { $match: query },
            {
                $addFields: {
                    isOwner: username !== null ? { $in: [username, { $ifNull: ["$owners", []] }] } : false,
                    isEditor: username !== null ? { $in: [username, { $ifNull: ["$editors", []] }] } : false,
                    isViewer: username !== null ? { $in: [username, { $ifNull: ["$viewers", []] }] } : false,
                    isAdmin: { $literal: roles.includes('admin') }
                }
            }
        ];

        // Only add the $project stage if the user is not an admin
        if (!roles.includes('admin')) {
            aggregation.push({
                $project: {
                    editors: 0,
                    viewers: 0,
                    owners: 0,
                }
            });
        }

        var personas = await Persona.aggregate(aggregation).sort('momentUpdated').sort('name');

        if (personas.length > 0) {
            res.status(200).send({ message: "Here are all the active personas", payload: personas });
        } else {
            res.status(404).send({ message: "No active personas found", payload: [] });
        }
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
};


// Gets all the unique categories from the personas
exports.getCategories = async function (req, res, next) {
    try {
        var uniqueCategories = await Persona.aggregate([
            {
                $unwind: '$categories'
            },
            {
                $group: {
                    _id: '$categories.code',
                    code: { $first: '$categories.code' },
                    alpha: { $first: '$categories.alpha' },
                    label: { $first: '$categories.label' }
                }
            },
            {
                $project: {
                    //  uuid: '$_id',
                    code: 1,
                    alpha: 1,
                    label: 1
                }
            }
        ])
        res.status(201).send({ message: "Here are all the unique categories", payload: uniqueCategories });
    } catch (error) {
        res.status(400).send(error);
    }
};


// Gets all the unique skills from the personas
exports.getSkills = async function (req, res, next) {
    try {
        var uniqueSkills = await Persona.aggregate([
            {
                $unwind: '$skills'
            },
            {
                $group: {
                    _id: '$skills.uuid',
                    code: { $first: '$skills.code' },
                    alpha: { $first: '$skills.alpha' },
                    label: { $first: '$skills.label' },
                    description: { $first: '$skills.description' }
                }
            },
            {
                $project: {
                    uuid: '$_id',
                    code: 1,
                    alpha: 1,
                    label: 1,
                    description: 1
                }
            }
        ])
        res.status(201).send({ message: "Here are all the unique skills", payload: uniqueSkills });
    } catch (error) {
        res.status(400).send(error);
    }

};

exports.createPersonas = async function (req, res, next) {
    try {
        var personas = req.body.personas || req.query.personas || [];
        if (!Array.isArray(personas)) personas = [personas];

        //Set the person who created this persona, if applicable
        personas.forEach((persona) => {
            if (req.tokenDecoded) {
                persona.owners = [req.tokenDecoded.username];
                persona.editors = [req.tokenDecoded.username];
                persona.viewers = [req.tokenDecoded.username];
                persona.createdBy = req.tokenDecoded.username;
            }
        })

        var results = await Persona.insertMany(personas)
        console.log("Results", results)
        //Get the first persona inserted and return it;

        res.status(201).send({ message: "Created all the identified personas", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.createAvatar = async function (req, res, next) {
    try {
        var avatarPrompt = req.body.avatarPrompt || req.query.avatarPrompt || [];
        console.log("avatarPrompt", avatarPrompt)
        const image = await axios.post('https://api.openai.com/v1/images/generations',
            {
                "prompt": avatarPrompt,
                "size": "256x256",
                response_format: "b64_json"
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                }
            })

        var blobName = null;
        if (image?.data?.data?.[0]?.b64_json) {
            blobName = Date.now() + 'avatar.png';
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const buffer = Buffer.from(image.data.data[0].b64_json, 'base64');
            await blockBlobClient.uploadData(buffer);
        }
        res.status(201).send({ message: "Generated Avatar Image", payload: blobName });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.updatePersonas = async function (req, res, next) {
    try {
        var personas = req.body.personas || req.query.personas || [];
        if (!Array.isArray(personas)) personas = [personas];
        var updatedPersonas = [];
        var roles = req.tokenDecoded ? req.tokenDecoded.roles : [];
        var isAdmin = roles.includes('admin');

        // console.log("Update  Personas", personas)
        for (let persona of personas) {
            const { _id, ...updateData } = persona;
            var baseUpdateParams = {
                _id: _id,
                $or: [
                    { owners: req.tokenDecoded.username },
                    { editors: req.tokenDecoded.username },
                ]
            };

            // If the user is an admin, then we ignore the other conditions and just match the _id
            var updateParams = isAdmin ? { _id: _id } : baseUpdateParams;

            console.log("updateParams", updateParams);
            console.log("updateData", updateData);
            var results = await Persona.findOneAndUpdate(
                updateParams, { $set: updateData }, { new: true }
            );
            console.log("Results", results);
            updatedPersonas.push(results);
        }

        res.status(201).send({ message: "Here are your updated personas", payload: updatedPersonas });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
};


exports.deletePersonas = async function (req, res, next) {
    try {
        var personas = req.body.personas || req.query.personas || [];
        var roles = req.tokenDecoded ? req.tokenDecoded.roles : [];
        var isAdmin = roles.includes('admin');

        var aggregateResults = [];

        for (let persona of personas) {
            var baseDeleteParams = {
                uuid: persona.uuid,
                $or: [
                    { editors: req.tokenDecoded.username },
                    { owners: req.tokenDecoded.username },
                ]
            };

            // If the user is an admin, then we just match the uuid to allow status update
            var deleteParams = isAdmin ? { uuid: persona.uuid } : baseDeleteParams;

            var result = await Persona.findOneAndUpdate(deleteParams, { $set: { status: 'inactive' } }, { new: true });
            console.log("Result for persona with UUID:", persona.uuid, result);

            if (!result) {
                aggregateResults.push({ uuid: persona.uuid, status: "failed", reason: "Permission denied or persona not found." });
            } else {
                aggregateResults.push({ uuid: persona.uuid, status: "success", payload: result });
            }
        }

        res.status(201).send({ message: "Processed personas", results: aggregateResults });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
};



// exports.deletePersona = async function (req, res, next) {
//     try {
//         var persona = req.body.persona || req.query.persona || [];
//         var roles = req.tokenDecoded ? req.tokenDecoded.roles : [];
//         var isAdmin = roles.includes('admin');

//         var baseDeleteParams = {
//             uuid: persona.uuid,
//             $or: [
//                 { editors: req.tokenDecoded.username },
//                 { owners: req.tokenDecoded.username },
//             ]
//         };

//         // If the user is an admin, then we just match the uuid to allow deletion
//         var deleteParams = isAdmin ? { uuid: persona.uuid } : baseDeleteParams;

//         var results = await Persona.deleteOne(deleteParams);
//         console.log("Results", results);

//         if (results.deletedCount === 0) {
//             res.status(400).send({ message: "Permission denied or persona not found." });
//             return;
//         }

//         res.status(201).send({ message: "Deleted one persona", payload: results });
//     } catch (error) {
//         console.log(error);
//         res.status(400).send(error);
//     }
// };


// exports.deleteAllPersonas = async function (req, res, next) {
//     try {
//         var results = await Persona.deleteMany({})
//         console.log("Results", results)
//         res.status(201).send({ message: "Deleted all personas", payload: results });
//     } catch (error) {
//         console.log(error)
//         res.status(400).send(error);
//     }
// };


// Gets all the unique details from the link provided


exports.addLink = async function (req, res, next) {
    try {

        var username = req.tokenDecoded ? req.tokenDecoded.username : null;
        var personaUuid = req.body.personaUuid || req.query.personaUuid || "";
        var personaLink = req.body.personaLink || req.query.personaLink || "";
        var linkType = req.body.linkType || req.query.linkType || "";

        console.log({ username, personaUuid, personaLink, linkType })
        if (!username) {
            return res.status(400).send({ message: "Username not found in token" });
        }

        var update = {};

        if (linkType === 'editorLink') {
            update.editorLink = personaLink;
        } else if (linkType === 'viewerLink') {
            update.viewerLink = personaLink;
        } else {
            return res.status(400).send({ message: "Invalid linkType" });
        }

        var query = {
            uuid: personaUuid,
            $or: [
                { editors: username },
                { owners: username }
            ]
        };

        var updatedPersona = await Persona.updateOne(query, update);

        if (updatedPersona.nModified === 0) {
            return res.status(400).send({ message: "Unable to update. Ensure you have the right permissions." });
        }

        res.status(201).send({
            message: "Link Added to persona",
            payload: updatedPersona
        });

    } catch (error) {
        console.log("Error", error)
        res.status(400).send(error);
    }
};



// Gets all the unique details from the link provided
exports.linkDetails = async function (req, res, next) {
    try {

        var personaLink = req.body.personaLink || req.query.personaLink || "";
        var persona = await Persona.findOne({ $or: [{ editorLink: personaLink }, { viewerLink: personaLink }] })
            .select('name description url editorLink viewerLink');

        if (persona) {
            persona = persona.toObject();
            persona.isEditor = persona.editorLink === personaLink;
            persona.isViewer = persona.viewerLink === personaLink;
            delete persona.editorLink;
            delete persona.viewerLink;

            res.status(201).send({
                message: "Here is the persona",
                payload: persona
            });
        } else {
            res.status(404).send({ message: "Persona not found" });
        }
    } catch (error) {
        console.log("Error", error)
        res.status(400).send(error);
    }
};



//accept persona from the link
exports.acceptLink = async function (req, res, next) {
    try {
        var personaLink = req.body.personaLink || req.query.personaLink || "";
        var username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (!username) {
            return res.status(400).send({ message: "Username not found in token" });
        }

        var persona = await Persona.findOne({ $or: [{ editorLink: personaLink }, { viewerLink: personaLink }] })
            .select('editorLink viewerLink');

        if (!persona) {
            return res.status(404).send({ message: "Persona not found" });
        }

        var update = {};

        if (persona.editorLink === personaLink) {
            update.$addToSet = { editors: username };
        } else if (persona.viewerLink === personaLink) {
            update.$addToSet = { viewers: username };
        }

        await Persona.updateOne({ _id: persona._id }, update);

        res.status(201).send({
            message: "Persona link accepted"
        });

    } catch (error) {
        console.log("Error", error)

        res.status(400).send(error);
    }
};


//Publish 
// Gets all the unique details from the link provided
exports.publish = async function (req, res, next) {
    try {
        const publishStatus = req.body.publishStatus || req.query.publishStatus;
        const personaUuids = req.body.personaUuids || req.query.personaUuids || [];

        if (!publishStatus) {
            return res.status(400).send({ message: "Publish status is required" });
        }
        if (!personaUuids.length) {
            return res.status(400).send({ message: "Persona UUID is required" });
        }

        const username = req.tokenDecoded ? req.tokenDecoded.username : null;
        const roles = req.tokenDecoded ? req.tokenDecoded.roles : [];
        const isAdmin = roles.includes('admin');

        if (!isAdmin && (publishStatus === 'published' || publishStatus === 'suspended')) {
            return res.status(400).send({ message: "No permission to publish or suspend these personas" });
        }

        const allResults = await Promise.all(personaUuids.map(async (personaUuid) => {
            let updateParams = {
                uuid: personaUuid,
            };
            if (!isAdmin) {
                updateParams.$or = [
                    { owners: username },
                    { editors: username },
                ];
            }
            const setValues = { $set: { publishStatus: publishStatus } };
            return await Persona.findOneAndUpdate(updateParams, setValues, { new: true });
        }));

        res.status(200).send({
            message: "Publish status updated",
            payload: allResults
        });
    } catch (error) {
        console.log("Error", error);
        res.status(500).send(error);
    }
};

//Publish
// Middleware to check user roles
const checkUserRole = (req, res, next) => {
    const roles = req.tokenDecoded ? req.tokenDecoded.roles : [];
    req.isAdmin = roles.includes('admin');
    next();
};

// Middleware to validate request payload
const validatePayload = (req, res, next) => {
    const publishStatus = req.body.publishStatus || req.query.publishStatus;
    const personaUuids = req.body.personaUuids || req.query.personaUuids || [];

    if (!publishStatus) {
        return res.status(400).send({ message: "Publish status is required" });
    }
    if (!personaUuids.length) {
        return res.status(400).send({ message: "Persona UUID is required" });
    }

    req.publishStatus = publishStatus;
    req.personaUuids = personaUuids;

    next();
};

exports.publishPersonas = [
    checkUserRole,
    validatePayload,
    async function (req, res, next) {
        try {
            const { isAdmin, publishStatus, personaUuids } = req;
            console.log("isAdmin", isAdmin)

            // Check permissions
            if (!isAdmin && (publishStatus === 'published' || publishStatus === 'suspended')) {
                return res.status(400).send({ message: "No permission to publish or suspend these personas" });
            }

            // Define the update parameters
            const filter = { uuid: { $in: personaUuids } };
            if (!isAdmin) {
                filter.$or = [
                    { owners: req.tokenDecoded.username },
                    { editors: req.tokenDecoded.username }
                ];
            }
            const update = { $set: { publishStatus: publishStatus, publishedBy: req.tokenDecoded.username } };

            console.log("filter", filter)
            console.log("update", update)
            // Update all matching personas at once
            const result = await Persona.updateMany(filter, update);

            res.status(200).send({
                message: "Publish status updated",
                modifiedCount: result.nModified
            });
        } catch (error) {
            console.log("Error", error);
            res.status(500).send(error);
        }
    }
];



//Finetune
// Helper function for sending responses
const sendResponse = (res, status, message, payload = null) => {
    res.status(status).send({ message, payload });
};

// Create and upload a finetunem model
// Create and upload a finetune model
exports.createFinetune = async function (req, res, next) {
    try {
        const personaUuids = req.body.personaUuids || req.query.personaUuids || [];
        const username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (!personaUuids.length) { // Check if the array is empty
            return sendResponse(res, 400, "Persona UUID is required");
        }

        if (!username) {
            return sendResponse(res, 400, "Username not found in token");
        }

        const personas = await Persona.find({ uuid: { $in: personaUuids } });

        if (!personas.length) { // Check if the array is empty
            return sendResponse(res, 404, "Personas not found");
        }

        let trainingFiles = [];
        let fineTunes = [];
        for (const [index, persona] of personas.entries()) { // Use for...of loop for async/await
            const knowledgeProfileUuids = persona.knowledgeProfiles.map(kp => kp.uuid);
            if (knowledgeProfileUuids.length) {
                const facts = await factController.findFacts(username, knowledgeProfileUuids);
                const jsonl = factController.formatFactsToJsonl(facts, persona.basePrompt);
                validateJSONLString(jsonl);
                let trainingFile = await openai.files.create({
                    file: await toFile(Buffer.from(jsonl), 'input.jsonl'),
                    purpose: 'fine-tune', // or 'answers', 'classifications', 'search' depending on your use case
                });
                trainingFiles.push(trainingFile);
                await Persona.updateOne({ _id: persona._id }, { $push: { finetuneFiles: trainingFile } });

                const fineTune = await openai.fineTuning.jobs.create({ training_file: trainingFile.id, model: 'gpt-3.5-turbo' })
                fineTunes.push(fineTune);
                await Persona.updateOne({ _id: persona._id }, { $push: { finetuneModels: fineTune } });
            }
        }

        sendResponse(res, 201, "Personas uploaded for finetune", { trainingFiles, fineTunes });

    } catch (error) {
        console.error("Error:", error);
        sendResponse(res, 500, "An error occurred", error.toString());
    }
};

async function validateJSONLString(jsonlString) {
    const lines = jsonlString.split(/\r?\n/);
    let lineNumber = 0;

    for (const line of lines) {
        if (line.trim() === '') continue; // Skip empty lines
        lineNumber++;
        try {
            JSON.parse(line);
        } catch (error) {
            console.error(`Invalid JSON at line ${lineNumber}: ${error.message}`);
            return false;
        }
    }

    console.log('All lines are valid JSON!');
    return true;
}


exports.loadFinetuneStatus = async function (req, res, next) {
    try {
        const finetuneId = req.body.finetuneId || req.query.finetuneId || null;
        let status = null;
        if (finetuneId) {
            status = await openai.fineTuning.jobs.retrieve(finetuneId);
        }
        else {
            status = await openai.fineTuning.jobs.list({ limit: 10 });
        }
        sendResponse(res, 201, "Here are the statuses", status);
    } catch (error) {
        console.error("Error:", error);
        sendResponse(res, 500, "An error occurred", error.toString());
    }
}