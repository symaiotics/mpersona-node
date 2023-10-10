
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

// const { Configuration, OpenAIApi } = require("openai");

// const configuration = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
// });
// const openai = new OpenAIApi(configuration);


// Returns the personas
exports.getPersonas = async function (req, res, next) {
    try {
        // Get the public
        var username = req?.tokenDecoded?.username || null;
        var roles = req?.tokenDecoded?.roles || [];

        console.log('username', username)
        console.log('roles', roles)
        var query = { status: 'active', createdBy: 'public' };

        if (username) {
            query = {
                status: 'active',
                $or: [
                    { editors: username },
                    { viewers: username },
                    { owners: username },
                    { createdBy: username },
                    { createdBy: 'public' }
                ]
            };
        }

        // If roles include 'admin', adjust the query to get all active documents
        if (roles.includes('admin')) {
            query = {
                status: 'active'
            };
        }

        var aggregation = [
            { $match: query },
            {
                $addFields: {
                    isEditor: username !== null ? { $in: [username, { $ifNull: ["$editors", []] }] } : false,
                    isViewer: username !== null ? { $in: [username, { $ifNull: ["$viewers", []] }] } : false,
                    isOwner: username !== null ? { $in: [username, { $ifNull: ["$owners", []] }] } : false,
                    isCreatedBy: username !== null ? { $eq: [username, "$createdBy"] } : false,
                    // Add isAdmin based on roles
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
                    createdBy: 0
                }
            });
        }

        var personas = await Persona.aggregate(aggregation);

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
                persona.createdBy = req.tokenDecoded.username;
                persona.owners = [req.tokenDecoded.username];
                persona.editors = [req.tokenDecoded.username];
                persona.viewers = [req.tokenDecoded.username];
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
                    { editors: req.tokenDecoded.username },
                    { createdBy: req.tokenDecoded.username },
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
