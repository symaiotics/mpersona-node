
const express = require('express');
const mongoose = require('mongoose');

const Persona = require('../models/Persona');


// Accepts a new account and saves it to the database
exports.getPersonas = async function (req, res, next) {
    try {
        var personas = await Persona.find({ active: true })
        res.status(201).send({ message: "Here are all the active personas", payload: personas });
    } catch (error) {
        res.status(400).send(error);
    }

};
