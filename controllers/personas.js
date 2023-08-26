
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


// Accepts a new account and saves it to the database
exports.getPersonas = async function (req, res, next) {
    try {

        //Get the public
        var query = { status: 'active', createdBy: 'public' };
        if (req.tokenDecoded) {
            query = {
                status: 'active',
                $or: [
                    { editors: req.tokenDecoded.username },
                    { viewers: req.tokenDecoded.username },
                    { createdBy: req.tokenDecoded.username },
                    { createdBy: 'public' }

                ]
            }
        }

        // console.log(query)

        var personas = await Persona.find(query)
        res.status(201).send({ message: "Here are all the active personas", payload: personas });
    } catch (error) {
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
        personas.forEach(async (persona) => {
            const { _id, ...updateData } = persona;
            var results = await Persona.findOneAndUpdate(
                {
                    _id: _id,
                    $or: [
                        { editors: req.tokenDecoded.username },
                        { createdBy: req.tokenDecoded.username }, //does it matter who the creator was?
                    ]

                }, { $set: updateData }, { new: true }
            )
            updatedPersonas.push((results))
        })

        res.status(201).send({ message: "Here are your updated personas", payload: updatedPersonas });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.deletePersona = async function (req, res, next) {
    try {
        var persona = req.body.persona || req.query.persona || [];
        var results = await Persona.deleteOne({ uuid: persona.uuid })
        console.log("Results", results)
        res.status(201).send({ message: "Deleted one personas", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.deleteAllPersonas = async function (req, res, next) {
    try {
        var results = await Persona.deleteMany({})
        console.log("Results", results)
        res.status(201).send({ message: "Deleted all personas", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

