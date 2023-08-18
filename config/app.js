//Create the app object
const express = require("express");
const app = express();
const path = require('path');
const WebSocket = require('ws');

const uuidv4  = require('uuid').v4;


//Process JSON and urlencoded parameters
app.use(express.json({ extended: true, limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' })); //The largest incoming payload

//Establish local environment variables
const dotenv = require('dotenv').config()

//Select the default port
const port = process.env.PORT || 3000;

//Implement basic protocols with Helmet and CORS
const helmet = require('helmet');
app.use(helmet()) //You may need to set parameters such as contentSecurityPolicy: false,

const cors = require('cors');
var corsOptions = {
    origin: ['https://somedomain.com'], //restrict to only use this domain for requests
    optionsSuccessStatus: 200, // For legacy browser support
    methods: "GET, POST, PUT, DELETE" //allowable methods
}

//Implement context-specific CORS responses
// if (process.env.MODE == 'PROD') app.use(cors(corsOptions)); //Restrict CORS
// if (process.env.MODE == 'DEV') 

app.use(cors()); //Unrestricted CORS

//Register Custom Global Middleware
const logger = require("../middleware/logger").logger;
app.use(logger)

//Create HTTP Server
const server = require('http').createServer(app);
server.listen(port, () => console.log(`Simple app listening at http://localhost:${port}`))

//Connect to the Database (Mongoose for MongoDB and Azure CosmosDB)
//MongoDB or CosmosDB connector using Mongoose ODM
if (process.env.DATASTORE == 'MongoDB' || process.env.DATASTORE == 'CosmosDB') {
    const initDb = require("./mongoose").initDb;
    initDb(function (err) {
      if (err) throw err;
    });
  }


  
// Create a WebSocket server instance, sharing the HTTP server
const wss = new WebSocket.Server({ server });

// Set up an event listener for incoming WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.uuid = uuidv4();
  ws.send(JSON.stringify({ uuid: ws.uuid }));

  // Handle messages received from clients
  ws.on('message', (message) => {
    // console.log('Received:', message);
    
    // Send a message back to the client
    // ws.send('Hello from the server!');
  });
});

//Export the app for use on the index.js page
module.exports = { app, wss };