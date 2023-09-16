
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const WorkStream = require('../models/WorkStream');
// Accepts a new account and saves it to the database
exports.getWorkStreams = async function (req, res, next) {
    try {

        //Get the public
        var query = { status: 'active', createdBy: 'public' };
        if (req.tokenDecoded) {
            query = {
                status: 'active',
                $or: [
                    { owners: req.tokenDecoded.username },
                    { editors: req.tokenDecoded.username },
                    { viewers: req.tokenDecoded.username },
                    { createdBy: req.tokenDecoded.username },
                    { createdBy: 'public' }
                ]
            }
        }

        var workStreams = await WorkStream.find(query).select("-editors -viewers -owners -createdBy");
        res.status(201).send({ message: "Here are all the work streams", payload: workStreams });
    } catch (error) {
        res.status(400).send(error);
    }
};

exports.createWorkStreams = async function (req, res, next) {
    try {
        var workStreams = req.body.workStreams || req.query.workStreams || [];
        if (!Array.isArray(workStreams)) workStreams = [workStreams];

        //Set the person who created this Work Stream, if applicable
        workStreams.forEach((workStream) => {
            workStream.createdBy = 'public';
            if (req.tokenDecoded) {
                workStream.createdBy = req.tokenDecoded.username;
                workStream.owners = [req.tokenDecoded.username];
                workStream.editors = [req.tokenDecoded.username];
                workStream.viewers = [req.tokenDecoded.username];
            }
        })

        var results = await WorkStream.insertMany(workStreams)
        console.log("Results", results)

        res.status(201).send({ message: "Created all the identified workStreams", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.updateWorkStreams = async function (req, res, next) {
    try {
        var workStreams = req.body.workStreams || req.query.workStreams || [];
        if (!Array.isArray(workStreams)) workStreams = [workStreams];
        var updatedWorkStreams = [];
        workStreams.forEach(async (workStream) => {
            const { _id, ...updateData } = workStream;
            var updateParams =
            {
                _id: _id,
                $or: [
                    { owners: req.tokenDecoded.owners },
                    { editors: req.tokenDecoded.username },
                    { createdBy: req.tokenDecoded.username }, //does it matter who the creator was?
                ]
            };

            var results = await WorkStream.findOneAndUpdate(updateParams, { $set: updateData }, { new: true })
            updatedWorkStreams.push((results))
        })

        res.status(201).send({ message: "Here are your updated Work Streams", payload: updatedWorkStreams });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.deleteWorkStream = async function (req, res, next) {
    try {
        var workStream = req.body.workStream || req.query.workStream || [];
        var results = await WorkStream.deleteOne({ uuid: workStream.uuid })
        console.log("Results", results)
        res.status(201).send({ message: "Deleted one Work Stream", payload: results });
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};


