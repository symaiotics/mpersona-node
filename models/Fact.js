// models/Persona.js
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const FactSchema = new Schema({
    uuid: {
        type: String,
        unique: false,
        required: true,
        default: uuidv4
    },

    //Reference knowledge profiles
    knowledgeProfileUuid: {
        type: String,
        required: false
    },

    //Reference knowledge profiles - Probably whole object not needed
    knowledgeProfile: {
        type: Object,
        required: false
    },


    //Reference file it came from
    fileUuid: {
        type: String,
        required: false
    },

    //The original unique storage URL of the file
    storageUrl: {
        type: String,
        required: false
    },

    //Context added via the UI
    context: {
        type: String,
        required: false
    },

    structures: {
        type: Array,
        required: false
    },

    contexts: {
        type: Array,
        required: false
    },

    originalContent: {
        type: String,
        required: false
    },
    keywords: {
        type: Array,
        required: false
    },

    fact: {
        type: String,
        required: true
    },

    questions: {
        type: Array,
        required: false
    },

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

const Fact = mongoose.model('Facts', FactSchema);
module.exports = Fact;
