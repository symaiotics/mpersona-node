// models/Persona.js
const { v4: uuidv4 } = require('uuid');


const mongoose = require('mongoose');
const { Schema } = mongoose;

const CategorySchema = new mongoose.Schema(
    {
        uuid: {
            type: String,
            unique: false,
            required: true,
            default: uuidv4
        },
        code: { type: Number, unique: false, required: true }, //numeric value
        alpha: { type: String, unique: false, required: true }, //reference value
        label: {
            en: {
                type: String,
                required: false
            },
            fr: {
                type: String,
                required: false
            }
        }
    });

const Category = mongoose.model('OLDCategory', CategorySchema);
module.exports = { CategorySchema, Category };
