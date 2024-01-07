//Generating JWT Secrets if you dont have one already
// const crypto = require('crypto');
// const secret = crypto.randomBytes(64).toString('hex');
// console.log('signing secret', secret)

//Establish local environment variables
const dotenv = require('dotenv').config()

//Create the app object
const express = require("express");
const app = express();
const path = require('path');
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const uuidv4 = require('uuid').v4;
const { Readable } = require('stream');

//Establish the AI Services
let services = { openAi: false, azureOpenAi: false, anthropic: false }
let openai, anthropic, azureEndpoint, azureApiKey, azureOpenAiStream;
//Initiate OpenAI
const OpenAI = require('openai');
if (process.env.OPENAI_API_KEY) {
  services.openAi = true;
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
  });
}

//Initiate Anthropic
const Anthropic = require('@anthropic-ai/sdk')
if (process.env.ANTHROPIC_API_KEY) {
  services.anthropic = true;
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
  });
}

const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
//Initiate Azure OpenAI
if (process.env.AZURE_OPENAI_KEY) {
  services.azureOpenAi = true;
  azureEndpoint = process.env["AZURE_OPENAI_ENDPOINT"];
  azureApiKey = process.env["AZURE_OPENAI_KEY"];

}

console.log("Services activated:", services)
console.log("Environment", process.env.NODE_ENV)
//Process JSON and urlencoded parameters
app.use(express.json({ extended: true, limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' })); //The largest incoming payload


//Select the default port
const port = process.env.PORT || 3000;

//Implement basic protocols with Helmet and CORS
const helmet = require('helmet');
app.use(helmet()) //You may need to set parameters such as contentSecurityPolicy: false,

const cors = require('cors');
// var corsOptions = {
//   origin: ['https://somedomain.com'], //restrict to only use this domain for requests
//   optionsSuccessStatus: 200, // For legacy browser support
//   methods: "GET, POST, PUT, DELETE" //allowable methods
// }

//Implement context-specific CORS responses
// if (process.env.MODE == 'PROD') app.use(cors(corsOptions)); //Restrict CORS
// if (process.env.MODE == 'DEV') 

app.use(cors(
  { exposedHeaders: ['Content-Length', 'Content-Type', 'auth-token', 'auth-token-decoded'] }
)); //Unrestricted CORS

//Bring in the logger
const expressLogger = require("../middleware/expressLogger");
app.use(expressLogger);

//Create HTTP Server
const server = http.createServer(app);
server.listen(port, () => console.log(`mPersona Node.js service listening at http://localhost:${port}`))

// app.use((req, res, next) => {
//   console.log('Protocol:', req.protocol);
//   console.log('Host:', req.get('host'));
//   console.log('Original URL:', req.originalUrl);
//   next();
// });


app.use((req, res, next) => {
  req.fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  next();
});

//Connect to the Database (Mongoose for MongoDB and Azure CosmosDB)
//MongoDB or CosmosDB connector using Mongoose ODM
if (process.env.DATASTORE == 'MongoDB' || process.env.DATASTORE == 'CosmosDB') {
  const initDb = require("./mongoose").initDb;
  initDb(function (err) {
    if (err) throw err;
  });
}


//New WSS
const wss = new WebSocket.Server({ server });
const clients = {}; // Create an object to store WebSocket instances by UUID

const sendToClient = (uuid, session, type, message = null) => {
  const clientWs = clients[uuid];
  if (clientWs && clientWs.readyState === WebSocket.OPEN) {
    const response = JSON.stringify({ session, type, message });
    clientWs.send(response);
  } else {
    console.error(`No open WebSocket found for UUID: ${uuid}`);
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.uuid = uuidv4();
  clients[ws.uuid] = ws;  // Store the WebSocket instance by UUID
  ws.send(JSON.stringify({ uuid: ws.uuid }));

  ws.on('message', (message) => {

    try {
      const data = JSON.parse(message);
      // Ensure the message contains a valid UUID before proceeding
      if (data.uuid) {
        if (data.type === 'ping') {
          // Use the sendToClient function to send the pong response only to the client that sent the ping
          sendToClient(data.uuid, data.session, 'pong');
        }

        else if (data.type === 'prompt') {
          // Use the sendToClient function to send the pong response only to the client that sent the ping
          prompt(data.uuid, data.session, data.provider || 'openAi', data.model || 'gpt-4', data.temperature, data.systemPrompt, data.userPrompt, data.messageHistory, data.knowledgeProfileUuids);
        }

        else {
          // Use the sendToClient function to send an error response only to the client that sent the unrecognized message
          sendToClient(data.uuid, data.session, 'error', 'Unrecognized message type');
        }
      } else {
        // Respond with an error if the UUID is missing
        ws.send(JSON.stringify({ message: 'UUID is missing from the message' }));
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
      // Respond with a generic error message if the message cannot be parsed
      ws.send(JSON.stringify({ message: 'Error processing message' }));
    }
  });

  ws.on('close', () => {
    // Remove the WebSocket instance from the clients object when the connection is closed
    delete clients[ws.uuid];
  });
});

//Execute an OpenAI prompt
async function prompt(uuid, session, provider, model, temperature, systemPrompt, userPrompt, messageHistory, knowledgeProfileUuids) {
  console.log("Prompt beginning")
  //Enrich the prompt with some context data
  // userPrompt = "The date is " + new Date().toDateString() + "\n\n" + userPrompt + "\n\n";
  let messages = [];
  if (messageHistory?.length) {
    messages = messageHistory;
  }

  else {
    messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ];
  }


  //Get the Knowwledge Profiles information
  //Retrieves the facts from the DB and appends them to the systemPrompt

  try {
    let knowledgePrompt = "Here are some additional facts which may be relevant to your answer.\n\n";
    knowledgePrompt = knowledgePrompt + '\n\nFacts:\nUse these facts in the preparation of your response ONLY if they are specifically relevant to the question. \nOtherwise ignore them completely. \nIf the question does not relate to these facts, do not use any information from these facts. \nIf the topics of the question do not relate, do not use! :\n\n';
    let facts = [];
    let topScore = 0;
    let addedKnowledge = false;
    if (knowledgeProfileUuids && knowledgeProfileUuids.length) {
      facts = await factsController.getFactsFromKnowledgeProfiles(userPrompt, knowledgeProfileUuids)
      if (facts.length) {
        facts.forEach((fact, index) => {
          //Resolves weird Mongo object issue with scpre
          fact = JSON.parse(JSON.stringify(fact))
          if (index == 0) topScore = parseFloat(fact.score);
          if (index < 20 && fact.score >= (topScore / 2)) {
            knowledgePrompt += " > " + fact.fact + "\n";
          }
        })
        addedKnowledge = true;
      }
    }

    //Add in the system prompt, if knowledge prompt returned
    if (addedKnowledge) {
      messages.push(
        {
          role: "system",
          content: knowledgePrompt
        }
      )
    }

    //Works with both openAi and anthropic
    var fullPrompt = {
      model: model,
      temperature: parseFloat(temperature) || 0.5,
      stream: true,
    };

    //Initiate the stream
    let responseStream;
    if (services.openAi && provider === 'openAi') {
      fullPrompt.messages = messages;
      responseStream = await openai.chat.completions.create(fullPrompt);
    }

    else if (services.anthropic && provider === 'anthropic') {
      fullPrompt.prompt = formatAnthropic(messages);
      fullPrompt.max_tokens_to_sample = 4096; //Recommended for Claude 2.1 
      responseStream = await anthropic.completions.create(fullPrompt);
    }

    else if (services.azureOpenAi && provider === 'azureOpenAi') {
      fullPrompt = { temperature: parseFloat(temperature) || 0.5 }
      const client = new OpenAIClient(azureEndpoint, new AzureKeyCredential(azureApiKey));
      responseStream = await client.listChatCompletions(model, messages, fullPrompt);
    }

    //Handle the Streamed tokens in response and return them to the client
    if ((services.openAi && provider === 'openAi') || (services.anthropic && provider === 'anthropic')) {
      for await (const part of responseStream) {
        try {
          if (provider === 'openAi') {
            if (part?.choices?.[0]?.delta?.content) sendToClient(uuid, session, "message", part.choices[0].delta.content)
            else sendToClient(uuid, session, "EOM", null)
          }

          if (provider === 'anthropic') {
            if (part.completion && !part.stop_reason) sendToClient(uuid, session, "message", part.completion)
            if (part.stop_reason) sendToClient(uuid, session, "EOM", null);
          }
        }
        catch (error) {
          //Send error back to the client
          var errorObj = {
            status: error?.response?.status,
            statusText: error?.response?.statusText
          }
          sendToClient(uuid, session, "ERROR", JSON.stringify(errorObj))
          console.error('Could not JSON parse stream message', message, errorObj);
        }
      }
    }


    if (services.azureOpenAi && provider == 'azureOpenAi') {
      try {
        const stream = Readable.from(responseStream);

        stream.on('data', (event) => {
          try {
            for (const choice of event.choices) {
              if (choice.delta?.content !== undefined) {
                sendToClient(uuid, session, "message", choice.delta?.content)
              }
            }
          } catch (error) {
            // Handle error from 'data' event here
            sendToClient(uuid, session, "ERROR", JSON.stringify({ message: "Error processing stream data event.", error }));
          }
        });

        stream.on('end', () => {
          try {
            console.log("Stream End")
            sendToClient(uuid, session, "EOM", null);
          } catch (error) {
            // Handle error from 'end' event here
            sendToClient(uuid, session, "ERROR", JSON.stringify({ message: "Error processing stream end event.", error }));
          }
        });

        stream.on('error', (error) => {
          // Handle stream error here
          console.log("Stream Error", error)
          sendToClient(uuid, session, "ERROR", JSON.stringify({ message: "Stream error.", error:error.message }));
        });
      } catch (error) {
        console.log("Prompt Error")

        // Handle error from setting up the stream handlers
        sendToClient(uuid, session, "ERROR", JSON.stringify({ message: "Error setting up stream handlers.", error }));
      }
    }


  }
  catch (error) {
    console.log("Prompt Error", error)
    var errorObj = {
      status: error?.response?.status,
      statusText: error?.response?.statusText
    }
    sendToClient(uuid, session, "ERROR", JSON.stringify(error))
    console.error('Could not JSON parse stream message', error);
    // res.status(500).send({ message: "Prompt failure", payload: error })
  }
}

// prompt: `${Anthropic.HUMAN_PROMPT} How many toes do dogs have?${Anthropic.AI_PROMPT}`,
function formatAnthropic(messageHistory) {
  let anthropicString = "";
  messageHistory.forEach((message, index) => {
    const prompt = message.role === 'system'
      ? (index === 0 ? '' : Anthropic.AI_PROMPT)
      : Anthropic.HUMAN_PROMPT;
    anthropicString += prompt + message.content;

  });
  anthropicString += Anthropic.AI_PROMPT;
  return anthropicString; // Return the resulting string
}

//Export the app for use on the index.js page
module.exports = { app, wss, sendToClient, prompt };