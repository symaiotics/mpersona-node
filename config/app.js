//Generating JWT Secrets
// const crypto = require('crypto');
// const secret = crypto.randomBytes(64).toString('hex');
// console.log('signing secret', secret)

//Create the app object
const express = require("express");
const app = express();
const path = require('path');
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const uuidv4 = require('uuid').v4;

const factsController = require('../controllers/facts')

//Process JSON and urlencoded parameters
app.use(express.json({ extended: true, limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' })); //The largest incoming payload

//Establish local environment variables
const dotenv = require('dotenv').config()

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

//Register Custom Global Middleware
const logger = require("../middleware/logger").logger;
app.use(logger)



//Create HTTP Server
const server = http.createServer(app);

server.listen(port, () => console.log(`Simple app listening at http://localhost:${port}`))

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


//Old WSS 2023-09-08
// // Create a WebSocket server instance, sharing the HTTP server
// const wss = new WebSocket.Server({ server });

// // Set up an event listener for incoming WebSocket connections
// wss.on('connection', (ws) => {
//   console.log('Client connected');

//   ws.uuid = uuidv4();
//   ws.send(JSON.stringify({ uuid: ws.uuid }));

//   // Handle messages received from clients
//   ws.on('message', (message) => {

//     // Send a message back to the client
//     ws.send(JSON.stringify({message:'Received'}));
//   });
// });



//Open AI
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);




//New WSS
const wss = new WebSocket.Server({ server });

// Create an object to store WebSocket instances by UUID

const clients = {};

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
          console.log("Prompt Object", data)
          prompt(data.uuid, data.session, data.model, data.temperature, data.systemPrompt, data.userPrompt, data.knowledgeProfileUuids);
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
async function prompt(uuid, session, model, temperature, systemPrompt, userPrompt, knowledgeProfileUuids) {

  //Enrich the prompt with some context data
  userPrompt = "The date is " + new Date().toDateString() + "\n\n" + userPrompt + "\n\n";


  try {
    var messages = [
      {
        role: "user",
        content: userPrompt
      }
    ];


    console.log("knowledgeProfileUuids", knowledgeProfileUuids)

    //Get the Knowwledge Profiles information
    //Retrieves the facts from the DB and appends them to the systemPrompt
    let facts = [];
    let topScore = 0;
    if (knowledgeProfileUuids && knowledgeProfileUuids.length) {
      facts = await factsController.getFactsFromKnowledgeProfiles(userPrompt, knowledgeProfileUuids)
      if (facts.length) {
        console.log("Retreieved facts", facts.length)
        let factPrompt = "";
        facts.forEach((fact, index) => {
          //Resolves weird Mongo object issue with scpre
          fact = JSON.parse(JSON.stringify(fact))
          if (index == 0) topScore = parseFloat(fact.score);
          if (index < 20 && fact.score >= (topScore / 2)) {
            console.log(fact.fact)
            factPrompt += " > " + fact.fact + "\n";
          }
        })
 
        //Allow the user to set the position of the facts relative to the system prompt
        //Or remove, if they are using a finetune model
        systemPrompt = systemPrompt + '\n\nFacts:\nUse these facts in the preparation of your response ONLY if they are specifically relevant to the question. \nOtherwise ignore them completely. \nIf the question does not relate to these facts, do not use any information from these facts. \nIf the topics of the question do not relate, do not use! :\n\n' + factPrompt
      }
    }

    console.log("System Prompt", systemPrompt)
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
      temperature: parseFloat(temperature) || 0.5,
      stream: true,
    }

    const responseStream = await openai.createChatCompletion(fullPrompt, { responseType: 'stream' });

    responseStream.data.on('data', data => {

      const lines = data.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') {
          //Send EOM back to the client
          sendToClient(uuid, session, "EOM", null)
        }
        else {
          try {
            const parsed = JSON.parse(message).choices?.[0]?.delta?.content;
            if (parsed && parsed !== null && parsed !== 'null' && parsed !== 'undefined' && parsed !== undefined) {
              //Send the fragment back to the correct client
              // console.log(parsed)
              sendToClient(uuid, session, "message", parsed)
            }

          } catch (error) {
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
    });
  }
  catch (error) {
    // console.log("Error", error)
    try {
      var errorObj = {
        status: error?.response?.status,
        statusText: error?.response?.statusText
      }
      sendToClient(uuid, session, "ERROR", JSON.stringify(errorObj))
      console.error('Could not JSON parse stream message', message, errorObj);
    }
    catch (sendError) {
      console.log("Send Error", sendError)
    }
    // res.status(500).send({ message: "Prompt failure", payload: error })
  }
}



//Export the app for use on the index.js page
module.exports = { app, wss, sendToClient, prompt };