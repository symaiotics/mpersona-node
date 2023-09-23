// models/Persona.js
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const FileSchema = new Schema({
    uuid: {
        type: String,
        unique: false,
        required: true,
        default: uuidv4
    },

    //Textual description
    name: {
        type: String,
        required: true,
        default: "New File"
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

    context: { 
        type: String,
        required: false
    },
    storageUrl: { 
        type: String,
        required: false
    },

    extractedFileText: { 
        type: String,
        required: false
    },

    status: { 
        type: String,
        required: false
    },

    highlights: { 
        type: Array,
        required: false
    },


    lastSelection: { 
        type: Object,
        required: false
    },

    knowledgeProfileUuid: { 
        type: String,
        required: false
    },

    //Reference knowledge profiles - Probably whole object not needed
    knowledgeProfile: {
        type: Object,
        required: false
    },

    persona: { 
        type: Object,
        required: false
    },

    sockets: { 
        type: Array,
        required: false
    },

    facts: { 
        type: Array,
        required: false
    },
    
    triggerGeneration: { 
        type: Boolean,
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
    createdBy: {
        type: String,
        required: false
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


    momentCreated: {
        type: Date,
        default: Date.now,
        required: true,
    },


});

const File = mongoose.model('Files', FileSchema);
module.exports = File;
