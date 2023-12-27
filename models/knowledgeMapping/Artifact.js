const mongoose = require('mongoose');
const { Schema } = mongoose;

const administrativeFields = require('../common/administrativeFields');
const localizedField = require('../common/localizedField');
const localizedArrayField = require('../common/localizedArrayField');

const ArtifactSchema = new Schema({

    //Textual name and description
    name: localizedField('name'),
    description: localizedField('description'),

    //The Step 1 triage
    promptPersonaUuids: { type: Array, default: [] },
    promptText: { type: String },

    keywords: localizedArrayField('keywords'),

    categoryScores: {
        type: [{
            categoryUuid: { type: String, required: true },
            en: { type: String, trim: true },
            fr: { type: String, trim: true },
            score: { type: Number, default: null }
        }],
        validate: {
            validator: function (array) {
                return array.every(item => item.categoryUuid && (item.en || item.fr));
            },
            message: 'Each category score must have a `categoryUuid` and at least one of `en` or `fr` provided.'
        },
        default: []
    },


    //Step 2 Mapping 
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

    //Sets of Documents and Segment
    //If using a mapping, it will override the documentUuids and segmentUuids
    mappingUuids: {
        type: [String],
        default: []
    },

    //Step 3
    //Generated by the AI
    generatedPersonaUuids: {
        type: [String],
        default: []
    },
    generatedText: { type: String },

    auditPersonaUuids: {
        type: [String],
        default: []
    },
    auditText: { type: String },

    //Step 4, the back and forth discussions / revisions
    revisionMessageHistory: { type: Array },

    //With human edits and translation
    translationPersonaUuids: {
        type: [String],
        default: []
    },

    finalText: {
        en: {
            type: String,

        },
        fr: {
            type: String,

        }
    },
    ...administrativeFields
}, {
    collection: 'artifacts',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Artifact = mongoose.model('Artifact', ArtifactSchema);
module.exports = Artifact;
