//Import Required Libraries for this .js
const express = require("express");
const path = require('path');
const { app } = require("./config/app.js");

//Bring in custom error handling
const apiErrorHandler = require('./error/apiErrorHandler');

//Establish the Routes and Static Content
//Static Content
app.get('/favicon.ico', (req, res) => res.status(204));
app.use('/', express.static(path.join(__dirname, '/public')))

//Register the routes
//User management
app.use('/accounts', require('./routes/accounts'));

//Facts
app.use('/facts', require('./routes/facts'));

//Upload files
app.use('/files', require('./routes/files'));

//Misc services
app.use('/healthcheck', require('./routes/healthcheck'));

//Knowledge Profiles
app.use('/knowledgeProfiles', require('./routes/knowledgeProfiles'));

//Lexicon
app.use('/lexicon', require('./routes/lexicon'));

app.use('/personas', require('./routes/personas'));

//Rosters
app.use('/rosters', require('./routes/rosters'));

//Work Streams
app.use('/workStreams', require('./routes/workStreams'));


//New Knowledge Mapping features
app.use('/assignments', require('./routes/assignments.js'));
app.use('/knowledgeSets', require('./routes/knowledgeMapping/knowledgeSets.js'));
app.use('/categories', require('./routes/knowledgeMapping/categories.js'));
app.use('/tags', require('./routes/knowledgeMapping/tags.js'));
app.use('/documents', require('./routes/knowledgeMapping/documents.js'));
app.use('/segments', require('./routes/knowledgeMapping/segments.js'));
app.use('/artifacts', require('./routes/knowledgeMapping/artifacts.js'));


//Establish a 404 Not Found Custom Response
app.use((req, res, next) => {
    const error = new Error('This site was not found. Perhaps you want to call login?');
    error.status = 404;
    next(error);
})

//Implement the API Error Handler to catch everything
app.use(apiErrorHandler);
