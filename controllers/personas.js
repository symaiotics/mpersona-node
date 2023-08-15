
const express = require('express');
const mongoose = require('mongoose');

const Persona = require('../models/Persona');


// Accepts a new account and saves it to the database
exports.getPersonas = async function (req, res, next) {
    try {
        var personas = await Persona.find({ status: 'active' })
        res.status(201).send({ message: "Here are all the active personas", payload: personas });
    } catch (error) {
        res.status(400).send(error);
    }
};

// Gets all the unique categories from the personas
exports.getCategories = async function (req, res, next) {
    try {
        var uniqueCategories = await Persona.aggregate([
            {
                $unwind: '$categories'
            },
            {
                $group: {
                    _id: '$categories.uuid',
                    code: { $first: '$categories.code' },
                    alpha: { $first: '$categories.alpha' },
                    label: { $first: '$categories.label' }
                }
            },
            {
                $project: {
                    uuid: '$_id',
                    code: 1,
                    alpha: 1,
                    label: 1
                }
            }
        ])
        res.status(201).send({ message: "Here are all the unique categories", payload: uniqueCategories });
    } catch (error) {
        res.status(400).send(error);
    }
};


// Gets all the unique skills from the personas
exports.getSkills = async function (req, res, next) {
    try {
        var uniqueSkills = await Persona.aggregate([
            {
                $unwind: '$skills'
            },
            {
                $group: {
                    _id: '$skills.uuid',
                    code: { $first: '$skills.code' },
                    alpha: { $first: '$skills.alpha' },
                    label: { $first: '$skills.label' },
                    description: { $first: '$skills.description' }
                }
            },
            {
                $project: {
                    uuid: '$_id',
                    code: 1,
                    alpha: 1,
                    label: 1,
                    description: 1
                }
            }
        ])
        res.status(201).send({ message: "Here are all the unique skills", payload: uniqueSkills });
    } catch (error) {
        res.status(400).send(error);
    }

};

exports.createPersonas = async function (req, res, next) {
    try {
        var personas = req.body.personas || req.query.personas || [];
        var results = await Persona.insertMany(personas)
        console.log("Results", results)
        //Get the first persona inserted and return it;

        res.status(201).send({ message: "Created all the identified personas", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }

};

exports.deletePersona = async function (req, res, next) {
    try {
        var persona = req.body.persona || req.query.persona || [];
        var results = await Persona.deleteOne({ uuid: persona.uuid })
        console.log("Results", results)
        res.status(201).send({ message: "Deleted one personas", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.deleteAllPersonas = async function (req, res, next) {
    try {
        var results = await Persona.deleteMany({})
        console.log("Results", results)
        res.status(201).send({ message: "Deleted all personas", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

