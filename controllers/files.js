//Basic application requirements
// const express = require('express');
// const mongoose = require('mongoose');
// const axios = require('axios');

//File reading libraries
const fs = require('fs');
const fsp = require('fs').promises;
const mammoth = require('mammoth');
const { JSDOM } = require('jsdom');
const pdf = require('pdf-parse');

//Process the files locally and then to Azure
const upload = require('../services/upload');
const { uploadToAzure } = require('../services/azure-storage');

const File = require('../models/File');

exports.uploadFiles = [upload.array('files'), async function (req, res, next) {

    var uuids = req.body.uuids || req.query.uuids || [];
    if (!Array.isArray(uuids)) uuids = JSON.parse(uuids);
    console.log(uuids);
    const filesSuccess = [];
    const filesFailure = [];

    // Uploading files to Azure
    await Promise.all(req.files.map(async (file) => {
        console.log("Uploading to azure", file.filename);
        await uploadToAzure(file, 'files');
        file.storageUrl = 'files/' + file.filename;
    }));

    // Extracting text from files
    await Promise.all(req.files.map(async (file, index) => {
        let extractedFileText = '';
        try {
            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                extractedFileText = await extractTextFromDocx(file.path);
            } else if (file.mimetype === 'text/plain') {
                extractedFileText = await fsp.readFile(file.path, 'utf8');
            } else if (file.mimetype === 'application/json') {
                extractedFileText = await fsp.readFile(file.path, 'utf8');
            } else if (file.mimetype === 'text/html') {
                extractedFileText = await extractTextFromHTML(fs.readFileSync(file.path, 'utf8'));
            } else if (file.mimetype === 'application/pdf') {
                extractedFileText = await extractTextFromPdf(file.path);
            }
            var successObj = { uuid: uuids[index], name: file.filename, mimetype: file.mimetype, extractedFileText: extractedFileText, storageUrl: file.storageUrl };
            console.log("Success", successObj);
            filesSuccess.push(successObj);
        } catch (error) {
            console.log("Error", error);
            filesFailure.push({ uuid: uuids[index], name: file.filename, mimetype: null, extractedFileText: null, storageUrl: file.storageUrl, error: "Failed to process" });
        } finally {
            // Clean up the uploaded files
            fs.unlinkSync(file.path);
        }
    }));

    res.status(201).send({
        message: "Here are the processed files",
        payload: filesSuccess
    });
}];

exports.createFiles = async function (req, res, next) {
    try {
        var files = req.body.files || req.query.files || [];
        if (!Array.isArray(files)) files = [files];
        console.log("Creating files", files)
        //Set the person who created this file, if applicable
        files.forEach((file) => {
            if (req.tokenDecoded) {
                file.createdBy = req.tokenDecoded.username;
                file.editors = [req.tokenDecoded.username];
                file.owners = [req.tokenDecoded.username];
                file.viewers = [req.tokenDecoded.username];
            }
        })

        var results = await File.insertMany(files)
        //Get the first persona inserted and return it;

        res.status(201).send({ message: "Created all the identified files", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.updateFiles = async function (req, res, next) {
    try {
        var files = req.body.files || req.query.files || [];
        if (!Array.isArray(files)) files = [files];
        var updatedFiles = [];

        files.forEach(async (file) => {
            const { uuid, ...updateData } = file;
            var updateParams =
            {
                uuid: uuid,
                $or: [
                    { editors: req.tokenDecoded.username },
                    { createdBy: req.tokenDecoded.username }, //does it matter who the creator was?
                ]
            };

            var results = await File.findOneAndUpdate(
                updateParams, { $set: updateData }, { new: true }
            )
            updatedFiles.push((results))
        })

        res.status(201).send({ message: "Here are your updated files", payload: updatedFiles });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};


exports.getFiles = async function (req, res, next) {
    try {
        var username = req.tokenDecoded ? req.tokenDecoded.username : null;
        let knowledgeProfileUuid = req.body.knowledgeProfileUuid ? req.query.knowledgeProfileUuid : null;
        let query = { status: 'active', createdBy: 'public' };

        if (req.tokenDecoded) {
            query = {
                // status: 'active',
                $or: [
                    { owners: req.tokenDecoded.username },
                    { editors: req.tokenDecoded.username },
                    { viewers: req.tokenDecoded.username },
                    { createdBy: 'public' }
                ]
            };
        }

        if(knowledgeProfileUuid) query.knowledgeProfileUuid = knowledgeProfileUuid;

        console.log(query)
        const aggregation = [
            { $match: query },
            { $sort: { momentCreated: -1 } },
            // Add isEditor, isViewer, isOwner, isCreatedBy fields
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
                    uuid: 1,
                    name: 1,
                    description: 1,
                    context: 1,
                    storageUrl: 1,
                    extractedFileText: 1,
                    status: 1,
                    highlights: 1,
                    lastSelection: 1,
                    knowledgeProfileUuid: 1,
                    knowledgeProfile: 1,
                    persona: 1,
                    sockets: 1,
                    facts: 1,
                    triggerGeneration: 1,

                    isEditor: 1,
                    isViewer: 1,
                    isOwner: 1,
                    isCreatedBy: 1,
                 }
            }
        ];

        const results = await File.aggregate(aggregation);
console.log(results)
        res.status(201).send({ message: "Here are all requested files", payload: results });
    } catch (error) {
        console.log("Error", error)
        res.status(400).send(error);
    }
};

 

async function extractTextFromDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}

function extractTextFromHTML(html) {

    return new Promise((resolve, reject) => {

        try {


            const dom = new JSDOM(html);

            // Remove all <script> elements
            const scriptElements = dom.window.document.querySelectorAll('script');
            scriptElements.forEach(script => script.remove());

            var textContent = dom.window.document.body.textContent
            if (textContent.length) {
                textContent = textContent.replaceAll(/\n\n/g, "")
                textContent = textContent.replaceAll(/\s\s/g, " ")
                // console.log("html", textContent)
                resolve(textContent)
            }
            else resolve(null);

        }
        catch (error) {
            reject(error)
        }



    })


}

async function extractTextFromPdf(filename) {
    let dataBuffer = fs.readFileSync(filename);
    let data = await pdf(dataBuffer);
    return data.text;
}
