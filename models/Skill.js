// models/Skill.js
const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
    uuid: {
        type: String,
        unique: true,
        required: true
    },
    label: {
        en: {
            type: String,
            required: true
        },
        fr: {
            type: String,
            required: true
        }
    },
    description: {
        en: {
            type: String,
            required: true
        },
        fr: {
            type: String,
            required: true
        }
    }
});

module.exports = SkillSchema;
