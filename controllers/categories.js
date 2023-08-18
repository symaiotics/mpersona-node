
const express = require('express');
const mongoose = require('mongoose');
const { Category } = require('../models/Category');

exports.getCategories = async function (req, res, next) {
    try {
        Category.find({}).then((response) => {
            console.log("Response", response)
            res.status(201).send({ message: "Loaded categories collection", payload: response });
        }).catch((error) => {
            res.status(400).send(error);
        })
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.createCategories = async function (req, res, next) {
    try {
        var categories = req.body.categories || req.query.categories || [];

        //Category.insertMany(categories)
        
        Category.bulkWrite(
            categories.map((category) => 
              ({
                updateOne: {
                  filter: { code : category.code },
                  update: { $set: category },
                  upsert: true
                }
              })
            )
          ).then((response) => {
            console.log("Response", response)
            res.status(201).send({ message: "Inserted admin categories", payload: response });
        }).catch((error) => {
            res.status(400).send(error);
        })
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

exports.deleteAllCategories = async function (req, res, next) {
    try {
        var categories = req.body.categories || req.query.categories || [];
        Category.deleteMany({}).then((response) => {
            console.log("Response", response)
            res.status(201).send({ message: "Deleted all categories", payload: response });
        }).catch((error) => {
            console.log(error)
            res.status(400).send(error);
        })
    } catch (error) {
        console.log(error)
        res.status(400).send(error);
    }
};

