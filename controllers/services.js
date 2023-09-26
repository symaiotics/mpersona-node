// Importing promises API of fs module
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const officegen = require('officegen');
const archiver = require('archiver');

exports.convertPi = async function (req, res, next) {
    try {
        // Build the path to the file
        const filePath = path.join(__dirname, '../assets/fintrac', 'pi.json');

        // Read the file content
        const fileContent = await fsp.readFile(filePath, 'utf-8');

        // Parse the JSON content
        const { data } = JSON.parse(fileContent);

        // Process the data
        var zipFilePath = await processData(data);

        // Set response headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=output.zip');

        // Pipe the zip file's read stream to the response object
        fs.createReadStream(zipFilePath).pipe(res);

        // res.status(200).send({ message: "Data Parsed", payload: zipFile })

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};


const processData = async (data) => {
    const promises = data.map((item) => generateDocx(item));
    await Promise.all(promises);

    const zipFileName = `output_${Date.now()}.zip`;
    const output = fs.createWriteStream(zipFileName);
    const archive = archiver('zip');

    archive.pipe(output);
    data.forEach((item) => {
        archive.append(fs.createReadStream(`${item['PI-Number']}.docx`), { name: `${item['PI-Number']}.docx` });
    });

    await archive.finalize();
    return zipFileName;
};
const generateDocx = (item) => {
    return new Promise((resolve, reject) => {
        let docx = officegen('docx');

        docx.on('finalize', function () {
            resolve();
        });

        docx.on('error', function (err) {
            reject(err);
        });

        Object.keys(item).sort().forEach((key) => {
            let cleanText = stripHTML(item[key]).trim();
            let lines = cleanText.split('\n'); // Split the text by newline characters

            lines.forEach((line, lineIndex) => {
                if (line.toLowerCase().includes("question") || line.toLowerCase().includes("answer") || lineIndex === 0) {
                    // Start a new paragraph for "Question", "Answer", or the first line of each section
                    let pObj = docx.createP();
                    if (lineIndex === 0) pObj.addText(key, { bold: true }); // Add key as bold to the first line of each section
                    pObj.addText(line);
                } else {
                    // For lines that do not contain "Question" or "Answer", and are not the first line of each section, continue the current paragraph
                    docx.getCurrentParagraph().addText(line);
                }
            });
        });

        let out = fs.createWriteStream(`${item['PI-Number']}.docx`);
        out.on('error', function (err) {
            reject(err);
        });

        docx.generate(out);
    });
};



const he = require('he'); // HTML entity encoder/decoder

const stripHTML = (html) => {
    // Decode HTML entities
    let decodedStr = he.decode(html);

    // Replace specific HTML entities
    let replacedStr = decodedStr
        .replace(/&quot;/gi, '"')
        .replace(/&ldquo;/gi, '"')
        .replace(/&rdquo;/gi, '"')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&rsquo;/gi, "'")
        .replace(/&lsquo;/gi, "'")
        .replace(/&#39;/gi, "'");

    // Replace <summary> tags with new lines before and after the tag content
    replacedStr = replacedStr
        .replace(/<summary[^>]*>Question<\/summary>/gi, "\nQuestion\n\n")
        .replace(/<summary[^>]*>Answer<\/summary>/gi, "\nAnswer\n\n");

    // Remove any remaining HTML tags
    replacedStr = replacedStr.replace(/<[^>]*>?/gm, '');

    // Replace multiple spaces with a single space
    replacedStr = replacedStr.replace(/\s+/g, ' ');

    return replacedStr;
};
