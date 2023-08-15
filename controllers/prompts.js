


const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


//Load the specific controller plugins
const ApiError = require('../error/ApiError');
const uuidv4 = require('uuid').v4;
const promiseHandler = require('../error/promiseHandler');


// Accepts a new account and saves it to the database
exports.simplePrompt = async function (req, res, next) {

    //Load the prompt variables for a simple prompt
    var model = req.body.model || req.query.model || "gpt-3.5-turbo-16k";
    var prompt = req.body.prompt || req.query.prompt || "";
    var temperature = req.body.temperature || req.query.temperature || 0;
     
    try {
        const chat_completion = await openai.createChatCompletion({
            model: model,
            messages: [{
                role: "user",
                content: prompt
            }],
        });

        var response = chat_completion.data.choices;
        console.log(response)
        console.log("Extracted Code", extractCode(response[0].message.content)) //See what comes out from the extracted code.
        res.status(200).send({ message: `Here is the OpenAI GPT ${model} response to your prompt`, payload: response })
    }
    catch (error) {
        console.log("Error", error)
        res.status(500).send({ message: "Prompt failure", payload: error })
    }
};

function extractCode(answer) {
    let codes = [];
    if (answer) {
        const textCode = answer.match(/```([\s\S]+?)```/g);
        if (textCode && textCode.length > 0) {
            codes = textCode
                .join(" ")
                .split("```")
                .map((code) => code.trim())
                .filter((code) => code !== "")
                .map((c) => ({
                    key: c.slice(0, c.indexOf("\n")),
                    code: c.slice(c.indexOf("\n")),
                }));
        }
        console.log(codes);
    }
    return codes;
}