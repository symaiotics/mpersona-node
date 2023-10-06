//Accounts Controller
/*
The accounts controller contains the logic which processes API method received by the route
*/
//Load the specific controller plugins
const ApiError = require('../error/ApiError');
const uuidv4 = require('uuid').v4;
const promiseHandler = require('../error/promiseHandler');
const jwt = require('jsonwebtoken');
const createJWT = require('../middleware/verify').createJWT;
const bcrypt = require('bcrypt');
const { google } = require('googleapis');
let oauth2Credentials = null;
try
{
    console.log(process.env.client_id)
     oauth2Credentials = require('../_creds/credentials.json');
}
catch(error)
{
    //  oauth2Credentials = null;
    console.log("Error loading oauth2Creds, will use params instead")
}
// Accepts a new account and saves it to the database
exports.upgradeCode = async function (req, res, next) {

    //Plaintext passwords are kept separate from new account
    try {
        var code = req.body.code || req.query.code || null;

        const oauth2Client = new google.auth.OAuth2(
            oauth2Credentials?.web?.client_id || process.env.client_id,
            oauth2Credentials?.web?.client_secret || process.env.client_secret,
            oauth2Credentials?.web?.redirect_uris?.[0] || process.env.redirect_uri // assuming the first redirect URI is the one you want to use
        );

        const { tokens } = await oauth2Client.getToken(code);
        const tokensDecoded = jwt.decode(tokens.id_token)
        // console.log(tokens)
        // console.log(tokenDecoded)

        if (tokens) {
            // res.header('google-tokens', tokens)
            // res.header('google-token-decoded', JSON.stringify(tokensDecoded))
            res.status(200).send(JSON.stringify({ message: "success", payload: { tokens: tokens, tokensDecoded: tokensDecoded } }))
        }

        else res.status(500).send(JSON.stringify({ message: "failure", payload: null }))
    }
    catch (error) {
        console.log(error)
        res.status(500).send(JSON.stringify({ message: "failure", payload: null }))
    }
};


exports.getEmails = async function (req, res, next) {

    const gmail = google.gmail({ version: 'v1' });
    var tokens = req.body.tokens || req.query.tokens || null;
    var numberOfEmails = req.body.numberOfEmails || req.query.numberOfEmails || null;

    console.log("Loading email with tokens", tokens)

    const oauth2Client = new google.auth.OAuth2(
        oauth2Credentials?.web?.client_id || process.env.client_id,
        oauth2Credentials?.web?.client_secret || process.env.client_secret,
        oauth2Credentials?.web?.redirect_uris?.[0] || process.env.redirect_uri // assuming the first redirect URI is the one you want to use
    );

    oauth2Client.setCredentials(tokens);

    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: numberOfEmails,
            auth: oauth2Client,
        });
        const emails = await Promise.all(
            response.data.messages.map(async (message) => {
                const emailDetails = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    auth: oauth2Client,
                });

                const parts = emailDetails.data.payload.parts || [];
                const decodedParts = parts.map((part) => {
                    const { mimeType, body } = part;
                    const { data } = body;
                    const decodedData = data ? Buffer.from(data, 'base64').toString('utf-8') : 'Body is not available';
                    return { mimeType, body: { ...body, data: decodedData } };
                });

                return {
                    ...emailDetails.data,
                    payload: {
                        ...emailDetails.data.payload,
                        parts: decodedParts,
                    },
                };
            })
        );

        res.status(201).send({ message: "Here are the requested emails", payload: emails });

    } catch (error) {
        console.error('Error accessing Gmail API:', error);
        res.status(500).send('Error accessing Gmail API');
    }
};
