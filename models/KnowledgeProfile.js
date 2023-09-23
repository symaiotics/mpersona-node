// models/Persona.js
const { v4: uuidv4 } = require('uuid');


const mongoose = require('mongoose');
const { Schema } = mongoose;

const KnowledgeProfileSchema = new Schema({
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
        default: "New Knowledge Profile"
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
    sources: { //URL links
        type: String,
        required: false
    },
    context: { //Description of what this all is
        type: String,
        required: false
    },

    //Structure of the knowledge
    //Gained through the analysis of files. Each file further contains this information
    //This represents the combination of their structures, or a global structure which might span multiple files
     
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

const KnowledgeProfile = mongoose.model('KnowledgeProfile', KnowledgeProfileSchema);
module.exports = KnowledgeProfile;
