
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const KnowledgeProfile = require('../models/KnowledgeProfile');

const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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


// const mammoth = require('mammoth');
// async function extractTextFromDocx(filePath) {
//     const result = await mammoth.extractRawText({ path: filePath });
//     return result.value;
// }

// const { JSDOM } = require('jsdom');
// function extractTextFromHTML(html) {
//     const dom = new JSDOM(html);
//     return dom.window.document.body.textContent || "";
// }

// const pdf = require('pdf-parse');
// const fs = require('fs');
// async function extractTextFromPdf(filepath) {
//     let dataBuffer = fs.readFileSync(filename);
//     let data = await pdf(dataBuffer);
//     return data;
// }


//Analyze files
//Step 1: Upload one or more files
//Step 2: pdf-parse the PDFs or extract out the .txt or .html DOM
//pdf-parse for PDF
//jsdom for HTML
//fs for text files, or convert buffer to text on upload


//Step 3: Analyze the source structure

//Step 4: Based on the source structure, read the text and return JSON, breaking it into small chunks of information/
//Chunks must include the context of their structure
//Chunks should also retain a reference to their source file and the knowledge profile
//Chunks are saved into the DB under Knowledge
/* chunk structure
knowledgeProfile (uuid)
file (url with filename)
context (string)
fact (string) - the extracted information
factQuestion (string) - a generated question to which the answer would be the fact
*/

// Accepts a new account and saves it to the database
exports.analyzeSourceStructure = async function (req, res, next) {

    //Load the prompt variables for a simple prompt
    var userContext = req.body.userContext || req.query.userContext || "";
    var sample = req.body.sample || req.query.sample || "";
    var temperature = 0.5;
    var systemPrompt = `
    You are an analyst who reads documents to attempt to extract out and summarize as simply as possible the logical strucutre of how 
    their contents are arranged. You will look for things like headers and titles to determine this structure, as well as the 
    use of numbering systems such as 1. (1), 1.11.a or other indicators which make represent parts, sectuions, subsections, or clauses.
    You return this structure back as plaintext, not in a table or JSON or other structured format.
    `;

    var userPrompt = `
    The following text is a sample of ${userContext}. Analyze it to attempt to determine its organizational and logical structure. 
    Return a complete but concise description of its structure. Different documents contain different structures. For your reference.

    For example, if it is a legal or bylaw text, it may be broken down into the following structures
    Authority: 
    By-law Number: 
    Title: 
    Preamble: Whereas, And whereas, Now therefore
    Sections: 
    Subsections: 1.1, 2.1, 2.2, ...
    Clauses: (a), (b), (c), ...

    If it is a legal Act in Canada, it may contain
    Number
    When a bill is introduced in the House, it is assigned a number to facilitate filing and reference.109 During each session of a Parliament, government bills are numbered consecutively from C-2 to C-200.110 Private Members' bills are numbered consecutively from C-201 to C-1000 throughout the life of a Parliament, since they are not nullified by prorogation. 
    Private bills, which are rarely introduced in the House, are numbered beginning at C-1001. In order to differentiate between bills introduced in the two Houses of Parliament, the number assigned to bills introduced in the Senate begins with an “S” rather than a “C”. 
    Government bills originating in the Senate are numbered consecutively from S-1 to S-200, Senators' public bills are numbered consecutively from S-201 to S-1000, and Senators' private bills are numbered beginning at S-1001. Senate bills are neither renumbered nor reprinted when they are sent to the Commons.111
    
    Title
    The title is an essential element of a bill. A bill may have two titles: a full or long title and an abbreviated or short title.
    The long title appears both on the bill's cover page, under the number assigned to the bill, and at the top of the first page of the document. 
    It sets out the purpose of the bill, in general terms, and must accurately reflect its content. The short title is used mainly for purposes of citation, and does not necessarily cover all aspects of the bill. The first clause of the bill normally sets out the short title. Clause 1 of a bill may instead contain what is referred to as an “alternative title”, which may actually be longer than the long title.114
    
    Preamble
    Sometimes a bill has a preamble, which sets out its purposes and the reasons for introducing it.
    The preamble appears between the long title and the enacting clause.
    
    Enacting Clause
    The enacting clause is an essential part of the bill. 
    \It states the authority under which it is enacted, and consists of a brief paragraph following the long title and preceding the provisions of the bill: “Her Majesty, by and with the advice and consent of the Senate and House of Commons of Canada, enacts as follows:”. 
    In the event that there is a preamble, the enacting clause follows it.
    
    Clause
    Clauses—particular and separate articles of a bill—are its most fundamental constitutive element. 
    Clauses may be divided into subclauses, and then into paragraphs and even subparagraphs.
    A bill may (but need not) also be divided into parts, divisions and subdivisions, each containing one or more clauses; however, the numbering of the clauses is continuous from beginning to end. 
    A clause should express a single idea, preferably in a single sentence. A number of related ideas may be set out in subclauses within a single clause.
    
    Interpretation Provisions
    A bill will sometimes include (usually among its initial clauses) definitions or rules of interpretation which provide a legal definition of key expressions used in the legislation and indicate how those expressions apply. There is, however, no formal requirement that a bill include interpretation provisions.
    
    Coming-into-force Provisions
    A clause may be included in a bill specifying when the bill or certain of its provisions shall come into force. The coming into force of legislation may be delayed after Royal Assent if the bill contains a clause providing for its proclamation on another specific date or on a date to be fixed by Order in Council. In the absence of a coming-into-force provision, the bill will take effect on the day it is assented to.
    
    Schedules
    Schedules providing details that are essential to certain provisions of a bill may be appended to it. 
    There are two types of schedules
    Those that contain material unsuitable for insertion in the main body of the bill, such as, for example, tables, diagrams, lists and maps,
    Those that reproduce agreements falling within the prerogative of the Crown, such as, for example, treaties, conventions and protocols.123
    
    Explanatory Notes
    Summary
    Underlining and Vertical Lines
    Headings
    Table of Contents
    Royal Recommendation

    Here is the sample text to be analyzed: 
    ${sample}
    `;

    var model = "";
    var modelLength = systemPrompt.length + userPrompt.length;

    if (modelLength <= 30000) model = "gpt-4" //Of a total 32000 characters, leaving 2000 characters for a response
    if (modelLength > 30000 && modelLength <= 60000) model = "gpt-3.5-turbo-16k" //Of a total 32000 characters, leaving 2000 characters for a response
    //Truncate if necessary
    if (modelLength > 60000) {
        userPrompt = userPrompt.slice(0, 60000 - systemPrompt.length);
        model = "gpt-3.5-turbo-16k";
        console.log('truncated due to length of document')
    }

    //Add the user prompt buy defau;t
    var messages = [
        {
            role: "user",
            content: userPrompt
        }
    ];

    //Add in the system prompt, if one is provided
    if (systemPrompt) {
        messages.push(
            {
                role: "system",
                content: systemPrompt
            }
        )
    }

    var fullPrompt = {
        model: model,
        messages: messages,
        temperature: parseFloat(temperature),
        stream: true,
    }


    try {
        // const chat_completion = await openai.createChatCompletion(fullPrompt);
        const responseStream = await openai.createChatCompletion(fullPrompt, { responseType: 'stream' });

        var combinedResponse = "";
        responseStream.data.on('data', data => {
            // console.log('data.toString()', data.toString())
            const lines = data.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                const message = line.replace(/^data: /, '');
                if (message === '[DONE]') {
                    // return; // Stream finished
                    res.status(200).send({ message: `Here is the OpenAI GPT ${model} response to your prompt`, payload: { text: combinedResponse, code: [] } })
                    process.stdout.write(`DONE`);

                }
                else {
                    try {
                        const parsed = JSON.parse(message).choices?.[0]?.delta?.content;
                        if (parsed && parsed !== null && parsed !== 'null' && parsed !== 'undefined' && parsed !== undefined) {
                            //Send the fragment back to the correct client
                            if (wss && wsUuid) {
                                wss.clients.forEach((client) => {
                                    if (client.uuid == wsUuid) { //client.readyState === WebSocket.OPEN && 
                                        client.send(JSON.stringify({ fragment: parsed }));
                                    }
                                });
                            }
                            combinedResponse += parsed;
                            process.stdout.write(`.`); //Show some indication that it is still working
                        }

                    } catch (error) {
                        console.error('Could not JSON parse stream message', message, error);
                    }
                }
            }
        });


    }
    catch (error) {
        console.log("Error", error)
        res.status(500).send({ message: "Prompt failure", payload: error })
    }
};
