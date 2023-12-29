const mongoose = require('mongoose');
const { Schema } = mongoose;

const administrativeFields = require('../common/administrativeFields');
const localizedField = require('../common/localizedField');
const localizedArrayField = require('../common/localizedArrayField');

const ArtifactSchema = new Schema({

    //Textual name and description
    name: localizedField('name'),
    description: localizedField('description'),

    //If triaged
    keywords: localizedArrayField('keywords'),
    categories: { type: Array },

    //Q*A Mode
    prompt: { type: String },
    message: { type: String },
    auditText: { type: String },
    auditJson: { type: Object },
    //Chat Mode
    messageHistory: { type: Array },

    //Score
    completeness:{type:Number, min:0, max:10},
    accuracy:{type:Number, min:0, max:10},
    tone:{type:Number, min:0, max:10},
    overall:{type:Number, min:0, max:10},
    comments:{type:String},
    //Final translated
    finalText: {
        en: {
            type: String,
        },
        fr: {
            type: String,
        }
    },

    //PErsona used to generate
    personaUuids: {
        type: [String],
        default: []
    },

    //Documents uploaded
    documentUuids: {
        type: [String],
        default: []
    },

    //Extracts from documents
    segmentUuids: {
        type: [String],
        default: []
    },

    //If using a mapping, it will override the documentUuids and segmentUuids
    mappingUuids: {
        type: [String],
        default: []
    },

 
  


    ...administrativeFields
}, {
    collection: 'artifacts',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Artifact = mongoose.model('Artifact', ArtifactSchema);
module.exports = Artifact;
