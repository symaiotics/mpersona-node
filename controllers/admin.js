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

//Load the Models
const Persona = require('../models/Persona');

// Accepts a new account and saves it to the database
exports.editorToAll = async function (req, res, next) {


    res.status(200).send(JSON.stringify({ message: "success", payload: null }))
    // res.status(500).send(JSON.stringify({ message: "failure", payload: null }))
};

