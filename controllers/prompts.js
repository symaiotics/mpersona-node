


const { Configuration, OpenAIApi } = require("openai");

//Load the specific controller plugins
const ApiError = require('../error/ApiError');
const uuidv4 = require('uuid').v4;
const promiseHandler = require('../error/promiseHandler');


const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Accepts a new account and saves it to the database
exports.simplePrompt = async function (req, res, next) {

    //Load the prompt variables for a simple prompt
    var model = req.body.model || req.query.model || "gpt-3.5-turbo-16k";
    var userPrompt = req.body.userPrompt || req.query.userPrompt || "";
    var systemPrompt = req.body.systemPrompt || req.query.systemPrompt || null;
    var temperature = req.body.temperature || req.query.temperature || 0.7;

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
        temperature: parseFloat(temperature)
    }

    console.log("Full Prompt",fullPrompt)

    try {
        const chat_completion = await openai.createChatCompletion(fullPrompt);

        var response = chat_completion.data.choices;
        res.status(200).send({ message: `Here is the OpenAI GPT ${model} response to your prompt`, payload: { text: response, code: extractCode(response[0].message.content) } })
    }
    catch (error) {
        console.log("Error", error)
        res.status(500).send({ message: "Prompt failure", payload: error })
    }
};

function extractCode(answer) {
    let codes = [];
    try {
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
    catch (error) {
        return [];
    }

}