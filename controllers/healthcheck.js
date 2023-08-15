const express = require('express');
const mongoose = require('mongoose');

const Podcast = require('../models/podcast'); // assuming you have saved the schema model in a file named 'Podcast.js' in 'models' directory.




// Accepts a new account and saves it to the database
exports.doHealthcheck = async function (req, res, next) {

   
        res.status(201).send({message:"Healthcheck confirmed", payload:true});
     
};