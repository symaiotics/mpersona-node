const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs')
const Podcast = require('../models/podcast'); // assuming you have saved the schema model in a file named 'Podcast.js' in 'models' directory.
const Topic = require('../models/topic'); // Assuming you have the Topic model defined
 

// Accepts a new account and saves it to the database
exports.getGuestNames = async function (req, res, next) {

    try {
        var guestNames = await Podcast.aggregate([
            { $unwind: "$guests" },
            { $project: { _id: 0, name: "$guests.name" } }
        ]);
        console.log(guestNames)
        res.status(201).send({ message: "Here are the guest names", payload: guestNames });

    } catch (error) {
        console.error(error);
        res.status(400).send(error);
    }

};

// Accepts a new account and saves it to the database
exports.getTopics = async function (req, res, next) {

    try {
        var topics = await Podcast.aggregate([
            { $unwind: "$topics" },
            { $project: { _id: 0, topic: "$topics" } }
        ]);
        // console.log(topics)
        const topicsArray = topics.map(item => item.topic);
        const uniqueTopics = [...new Set(topicsArray)];

        res.status(201).send({ message: "Here are the topics", payload: uniqueTopics });
    } catch (error) {
        console.error(error);
        res.status(400).send(error);
    }

};

//Insert the topics Topics
exports.insertTopics = async function (req, res, next) {
    try {
        // Read the topics.json file
        // const jsonData = fs.readFileSync('../assets/topics.json ', 'utf8');
        var topics = fs.readFileSync('C:\\dev\\lexigraphs.com\\node\\assets\\topics.json', 'utf8');
        topics = JSON.parse(topics);

        // Insert topics into the database
        const insertedTopics = await Topic.insertMany(topics.topics);

        console.log(`Inserted ${insertedTopics.length} topics into the database.`);
        res.status(201).send({ message: "Inserted all topics", payload: insertedTopics });
    } catch (error) {
        console.error('Error inserting topics:', error);
        res.status(400).send(error);
    } finally {
        //Do nothing
    }
}

