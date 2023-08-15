


const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


//Load the specific controller plugins
const ApiError = require('../error/ApiError');
const uuidv4 = require('uuid').v4;
const promiseHandler = require('../error/promiseHandler');

const mongoose = require('mongoose');
const Podcast = require('../models/podcast.js'); // assuming you have saved the schema model in a file named 'Podcast.js' in 'models' directory.




// Accepts a new account and saves it to the database
exports.getTest = async function (req, res, next) {
    res.status(200).send({ message: "Test of the endpoint", payload: null })

};


// Accepts a new account and saves it to the database
exports.extractEntities = async function (req, res, next) {

    var items = req.body.items || req.query.items || [];
    var item = req.body.item || req.query.item || null;


    var gptPrompt = "";
    if (item) {
        gptPrompt =
            `Please extract me all the entities in this Podcast title into JSON format from this title: ${item.title}.
                        
            The JSON must follow this MongoDB schema using Mongoose ODM. 

            const guestSchema = new Schema({
                name: {
                    type: String,
                    required: true
                },
                biographicalInfo: {
                    type: String,
                    required: false
                },
                biographicalTopics: {
                    type: [String],
                    required: false
                }
            });

            const podcastSchema = new Schema({
                guests: {
                    type: [guestSchema],
                    required: false
                },
                topics: {
                    type: [String],
                    required: false
                },
                host: {
                    type: String,
                    required: false
                },
                podcastName: {
                    type: String,
                    required: false
                },
                episodeNumber: {
                    type: Number,
                    required: false
                },
                other: {
                    type: [String],
                    required: false
                },
                id: {
                    type: String,
                    required: false
                },
                img: {
                    type: String,
                    required: false
                },
                title: {
                    type: String,
                    required: false
                }
            });


        The JSON must contain the following keys: guests (array), topics (array of individual topics), host, podcastName, episodeEumber (remove the #, return only integer). 
        If there are any other entities, place them in an array called other.
        Within the guests array, provide an object per guest which contains a name key, a second key biographicalInfo which contains their biographical information as text, summarized up to 100 words in length, and a third key called biographicalTopics which is an array containing key topics and entities, including any associated business names or entities extracted from the biographical text
        Also include keys for the id which is ${item.id} and the img which is ${item.img} and the title.
        `
    }
    else {

        gptPrompt =
            `Please parse the following JSON structure and extract all the entities in the title into a new JSON format which includes keys from the provided JSON.
        Return the results in an array with the same number of elements as provided.
        The keys in each JSON object should include the original title, id, img and also add the new keys guests (array), topics (array), host, podcastName, episodeNumber. 
        If there are any other entities, place them in an array called other.
        Return only properly formatted JSON in your response. Do not reply with anything but JSON. This is imperitive.
        
        Here is the JSON array:
        ${JSON.stringify(items)}`;

    }

    console.log("Iniitiating request with prompt:", gptPrompt)
    const chat_completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-16k",
        messages: [{
            role: "user",
            content: gptPrompt

        }],
    });

    var response = chat_completion.data.choices;
    if (chat_completion?.data?.choices[0]?.message?.content) {
        response = chat_completion.data.choices[0].message.content;
        var jsonResponse = {};
        try {
            jsonResponse = extractJSON(response);
            console.log(jsonResponse);
        }
        catch (error) {
            console.log("JSON Parse error", error)
            jsonResponse = response;
        }
    }



    //Save it to MongoDB
    try {
        jsonResponse.channelSearch = "Lex Fridman"
        const podcast = new Podcast(jsonResponse);
        var atlasSave = await podcast.save(jsonResponse);
        console.log('Atlas Save', atlasSave)
    }
    catch (error) {
        console.log('Error saving podcast:' + jsonResponse, error)
    }

    //We need to return a result 
    res.status(200).send({ message: "Here are the extracted entities", payload: jsonResponse })
    //   res.status(500).send({ message: "New Account Failure", payload: process.env.MODE == 'DEV' ? results.failure : null })
};

function extractJSON(str) {
    let start = str.indexOf('{');
    if (start == -1) start = str.indexOf('[');
    if (start == -1) return null;
    try {
        return JSON.parse(str.slice(start));
    } catch (e) {
        return extractJSON(str.slice(start + 1));
    }
}