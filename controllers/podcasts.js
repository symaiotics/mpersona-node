const express = require('express');
const mongoose = require('mongoose');

const Podcast = require('../models/podcast'); // assuming you have saved the schema model in a file named 'Podcast.js' in 'models' directory.




// Accepts a new account and saves it to the database
exports.savePodcast = async function (req, res, next) {

    try {
        const podcast = new Podcast({
            speakers: req.body.speakers,
            topics: req.body.topics,
            host: req.body.host,
            podcast_name: req.body.podcast_name,
            episode_number: req.body.episode_number,
            other: req.body.other
        });

        await podcast.save();
        res.status(201).send(podcast);
    } catch (error) {
        res.status(400).send(error);
    }

};