const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const WorkStreamSchema = new Schema({
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

    stages: { //The array of stages including the personas
        type: Array,
        required: true
    },
    
    sessions: { //Object of the sessions within the Object as distinct UUIDs
        type: Object,
        required: true
    },


    //Administrative
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

const WorkStream = mongoose.model('WorkStream', WorkStreamSchema);
module.exports = WorkStream;
