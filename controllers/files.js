//Basic application requirements
// const express = require('express');
// const mongoose = require('mongoose');
// const axios = require('axios');

//File reading libraries
const fs = require('fs');
const mammoth = require('mammoth');
const { JSDOM } = require('jsdom');
const pdf = require('pdf-parse');

//Process the files locally and then to Azure
const upload = require('../services/upload');
const { uploadToAzure } = require('../services/azure-storage');

//Receive files uploaded from the front-end
exports.uploadFiles = [upload.array('files'), async function (req, res, next) {

    console.log("Upload Files")
    //Step 1 - Get the files in Multer added to req.files
    //Parse the files, done in the middleare above.

    //Step 2 - Save the originals for future reference
    // const files = req.files;
    for (let file of req.files) {
        console.log("Uploading to azure", file.filename)
        await uploadToAzure(file, 'files');
    }

    //Step 3 - Generate text files from each of them
    const results = [];
    for (let file of req.files) {
        let extractedText = '';
        try {
            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                extractedText = await extractTextFromDocx(file.path);
            } else if (file.mimetype === 'text/plain') {
                extractedText = fs.readFileSync(file.path, 'utf8');
            } else if (file.mimetype === 'application/json') {
                extractedText = fs.readFileSync(file.path, 'utf8');
            } else if (file.mimetype === 'text/html') {
                extractedText = extractTextFromHTML(fs.readFileSync(file.path, 'utf8'));
            } else if (file.mimetype === 'application/pdf') {
                extractedText = await extractTextFromPdf(file.path);
            }
            results.push({ filename: file.originalname, mime: file.mimetype, content: extractedText });
        } catch (error) {
            results.push({ filename: file.originalname, mime: null, content: null, error: "Failed to process" });
        } finally {
            // Clean up the uploaded files
            fs.unlinkSync(file.path);
        }
    }

    //Return the results
    res.status(201).send({ message: "Files uploaded", payload: results });

}];

async function extractTextFromDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}

function extractTextFromHTML(html) {
    const dom = new JSDOM(html);

    // Remove all <script> elements
    const scriptElements = dom.window.document.querySelectorAll('script');
    scriptElements.forEach(script => script.remove());

    var textContent = dom.window.document.body.textContent
    if (textContent.length) {
        textContent = textContent.replaceAll(/\n\n/g, "")
        textContent = textContent.replaceAll(/\s\s/g, " ")
        // console.log("html", textContent)
        return textContent
    }
    else return null;

}

async function extractTextFromPdf(filename) {
    let dataBuffer = fs.readFileSync(filename);
    let data = await pdf(dataBuffer);
    return data.text;
}

//Original
// exports.uploadFiles = async function (req, res, next) {
//     try {

//         await upload(req, res); // Use the Multer upload middleware to handle the uploaded files
//         const files = req.files;
//         for(let file of files) {
//             await uploadToAzure(file, 'files');
//         }

//         res.status(201).send({ message: "Files uploaded successfully", payload: null });
//     } catch (error) {
//         res.status(400).send(error);
//     }
// };

// exports.parseFiles = async function (req, res, next) {
//     try {
//         // var filename = "./assets/uxbridge/bylaws/Adequete-Heat-By-law.pdf"
//         // var filename = "./assets/uxbridge/bylaws/Street-Numbering-By-law.pdf"
//         // var filename = "./assets/uxbridge/bylaws/" + "28-2019-Region-of-Durham-Smoking-By-law.pdf"
//         var filename = "./assets/uxbridge/bylaws/" + "Shooting-Range-By-law.pdf"
//         var results = await parseLocalFile(filename);
//         console.log("Results", results)
//         res.status(201).send({ message: "Here is the parsed file", payload: results });
//     } catch (error) {
//         res.status(400).send(error);
//     }
// };

// async function parseLocalFile(filename) {
//     return new Promise(async (resolve, reject) => {

//         try {
//             let dataBuffer = fs.readFileSync(filename);
//             let data = await pdf(dataBuffer);
//             let text = data.text;
//             // console.log(text)
//             let jsonOutput = convertToJSONFormat1(text);
//             let jsonOutput2 = convertToJSONFormat2(text);
//             // let jsonOutput3 = convertToJSONFormat3(text);
//             console.log("3 done")
//             resolve({ jsonOutput, jsonOutput2 });

//         }
//         catch (error) {
//             reject({})
//         }
//     })
// }

// // function convertToJSON(text) {
// //     let sections = text.split(/Section \d+/).slice(1); // Split by "Section x" and remove the first empty element
// //     let json = {};
// //     for (let section of sections) {
// //         let lines = section.trim().split('\n').filter(line => line.trim() !== ''); // Split by newline and filter out empty lines
// //         let sectionTitle = lines[0].trim();
// //         json[sectionTitle] = {};

// //         for (let i = 1; i < lines.length; i++) {
// //             let line = lines[i];
// //             let match = line.match(/^(\d+\.\d+) (.+)$/); // Match "x.x Some text"

// //             if (match) {
// //                 let subsectionNumber = match[1];
// //                 let subsectionText = match[2];
// //                 json[sectionTitle][subsectionNumber] = subsectionText;
// //             }
// //         }
// //     }

// //     return json;
// // }

// //Format 1
// function convertToJSONFormat1(text) {
//     // Split by "SECTION" to capture each main section.
//     let mainSections = text.split(/SECTION\s*\d+/).slice(1);

//     let json = {};

//     for (let mainSection of mainSections) {
//         let lines = mainSection.trim().split('\n').filter(line => line.trim() !== '');

//         // The title of the section is the first line after splitting.
//         let sectionTitle = lines[0].trim();
//         json[sectionTitle] = {};

//         // Joining the rest of the lines to process subsections.
//         let joinedLines = lines.slice(1).join(' ');

//         // Splitting by the subsection pattern (e.g., "1.1", "2.1", "2.2", etc.).
//         let subsections = joinedLines.split(/(\d+\.\d+)/).slice(1);

//         for (let i = 0; i < subsections.length; i += 2) {
//             let subsectionNumber = subsections[i].trim();
//             let subsectionText = subsections[i + 1].trim();
//             json[sectionTitle][subsectionNumber] = subsectionText;
//         }
//     }

//     return json;
// }

// //Format 2
// function convertToJSONFormat2(text) {
//     // Clean the text: replace line breaks and '+' characters
//     text = text.replace(/\n/g, ' ').replace(/\+/g, '').replace(/  +/g, ' ');

//     // Split by Roman numerals to capture each main section.
//     let mainSections = text.split(/(I{1,3}\.)/).slice(1);

//     let json = {};

//     for (let i = 0; i < mainSections.length; i += 2) {
//         let sectionTitle = mainSections[i] + mainSections[i + 1].split(/\d+\.\s+/)[0].trim();

//         // Joining the rest of the lines to process subsections.
//         let joinedLines = mainSections[i + 1];

//         // Splitting by the subsection pattern (e.g., "1. (1)", "2. (2)", etc.).
//         let subsections = joinedLines.split(/(\d+\.\s+\(\d+\)|\d+\.\s+)/).slice(1);

//         json[sectionTitle] = {};

//         for (let j = 0; j < subsections.length; j += 2) {
//             let subsectionNumber = subsections[j].trim();
//             let subsectionText = subsections[j + 1].trim();
//             json[sectionTitle][subsectionNumber] = subsectionText;
//         }
//     }

//     return json;
// }

// const convertToJSONFormat3 = (text) => {
//     console.log("3")
//     let bylawText = text;
//     // Extract data from the bylaw text
//     const authority = bylawText.match(/Authority: (.*)/)[1];
//     const bylawNumber = bylawText.match(/By-law Number (.*)/)[1];
//     const title = bylawText.match(/of The Regional Municipality of Durham\n(.*)/)[1];
//     const preamble = bylawText.match(/Being a by-law.*\n\n([\s\S]*?)\n1\./)[1].split('\n').filter(line => line.trim());

//     const sections = [];
//     const sectionMatches = bylawText.matchAll(/(\d+)\. ([\s\S]*?)(?=\n\d+\. |\n$)/g);
//     for (const sectionMatch of sectionMatches) {
//         const section = {
//             SectionNumber: parseInt(sectionMatch[1]),
//             SectionTitle: sectionMatch[2].split('\n')[0],
//             Subsections: []
//         };
//         const subsectionMatches = sectionMatch[2].matchAll(/(\d+\.\d+) ([\s\S]*?)(?=\d+\.\d+ |\n$)/g);
//         for (const subsectionMatch of subsectionMatches) {
//             const subsection = {
//                 SubsectionNumber: subsectionMatch[1],
//                 SubsectionContent: subsectionMatch[2].split('\n')[0],
//                 Clauses: []
//             };
//             const clauseMatches = subsectionMatch[2].matchAll(/\((\w)\) ([\s\S]*?)(?=\(\w\) |\n$)/g);
//             for (const clauseMatch of clauseMatches) {
//                 const clause = {
//                     ClauseLabel: clauseMatch[1],
//                     ClauseContent: clauseMatch[2]
//                 };
//                 subsection.Clauses.push(clause);
//             }
//             section.Subsections.push(subsection);
//         }
//         sections.push(section);
//     }

//     return {
//         Authority: authority,
//         ByLawNumber: bylawNumber,
//         Title: title,
//         Preamble: preamble,
//         Sections: sections
//     };

// };