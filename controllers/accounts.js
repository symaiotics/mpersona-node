//Accounts Controller
/*
The accounts controller contains the logic which processes API method received by the route
*/

//Load the specific controller plugins
const ApiError = require('../error/ApiError');
const uuidv4  = require('uuid').v4;
const promiseHandler  = require('../error/promiseHandler');

//Load the Models
const mongoose = require("../config/mongoose").mongoose;
const accountSchema = require("../models/account").accountSchema
var Account = mongoose.model('accounts', accountSchema);//



// Returns a full list of accounts
exports.getAccounts = function(req, res, next) {
    res.status(200).send({message:"Here are all the accounts", payload:null})
};

// Accepts a new account and saves it to the database
exports.postNewAccount = async function(req, res, next) {
   
    var newAccount = req.body.account;
   
    //Perform some validation on the new account

    //Always set important vairables on the server side. We never trust the client side.
    newAccount.id = uuidv4();
    newAccount.momentCreated = new Date();
    newAccount.roles = ['reader']; //Default to he lowest level of access
    newAccount.active = true; //Set the account to be active

    //Set defaults if not user
    if(!newAccount.preferredLng) newAccount.preferredLng = 'en'; //Default to english

    //Save the new account to the DB
    //Mongoose performs a schema validation as part of the .save process
    var doc = Account(newAccount);
    var results = await promiseHandler(doc.save(),5000);

    //We need to return a result 
    if(results.success) res.status(200).send({message:"New Account Created Successfully!", payload:results.success})
    else res.status(500).send({message:"New Account Failure", payload:process.env.MODE == 'DEV'?results.failure:null})
};
