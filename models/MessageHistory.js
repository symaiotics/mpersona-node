// models/Persona.js
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageHistorySchema = new Schema({
    uuid: {
        type: String,
        unique: false,
        required: true,
        default: uuidv4
    },

    name: {
        type: String,
        required: true,
        default: "New History"
    },

    description: {
        en: {
            type: String,
            required: false
        },
        fr: {
            type: String,
            required: false
        }
    },

    messageHistory: { type: Array, required: true, default: [] },

    owners: {
        type: Array,
        default: []
    },
    editors: {
        type: Array,
        default: []
    },
    viewers: {
        type: Array,
        default: []
    },

    ownerLink: {
        type: String,
    },

    editorLink: {
        type: String,
    },

    viewerLink: {
        type: String,
    },


    createdBy: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        required: true,
    },
    momentCreated: {
        type: Date,
        default: Date.now,
        required: true,
    },


});

const MessageHistory = mongoose.model('MessageHistory', MessageHistorySchema);
module.exports = MessageHistory;
