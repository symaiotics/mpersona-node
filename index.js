//Import Required Libraries for this .js
const express = require("express");
const path = require('path');
const app = require("./config/app.js");

//Bring in custom error handling
const apiErrorHandler = require('./error/apiErrorHandler');

//Establish the Routes and Static Content
//If in DEV, publish the HTML content in the Public Folder for testing
if (process.env.MODE == 'DEV') app.use('/', express.static(path.join(__dirname, '/public')))

//Register the routes
app.use('/healthcheck', require('./routes/healthcheck'));
app.use('/accounts', require('./routes/accounts'));
app.use('/entities', require('./routes/entities'));
app.use('/info', require('./routes/info'));
app.use('/prompts', require('./routes/prompts'));

//Establish a 404 Not Found Custom Response
app.use((req, res,next)=>{
    const error = new Error('This site was not found. Perhaps you want to call login?');
    error.status = 404;
    next(error);
})

//Implement the API Error Handler to catch everything
app.use(apiErrorHandler);
