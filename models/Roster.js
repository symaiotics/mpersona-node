// models/Roster.js
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const RosterSchema = new Schema({
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
        default: "New Roster"
    },

    url: {
        type: String,
        required: false,
        default: null
    },
    
    //For the URL
    referenceName: {
        type: String,
        required: false
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

    // Copies
    knowledgeProfiles: {
        type: Array,
        default: []
    },

    //References
    knowledgeProfileUuids: {
        type: Array,
        default: []
    },

    //Copies
    personas: {
        type: Array,
        default: []
    },

    //References
    personaUuids: {
        type: Array,
        default: []
    },

    //Administrative 
    publishStatus: {
        type: String,
        enum: ['unpublished', 'proposedForPublishing', 'published', 'suspended'],
        default: 'unpublished'
    },

    publishedBy: {
        type: String,
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

    isPublic: {
        type: Boolean,
        required: false,
        default: false
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    momentCreated: {
        type: Date,
        default: Date.now
    },


});

const Roster = mongoose.model('Roster', RosterSchema);
module.exports = Roster;
