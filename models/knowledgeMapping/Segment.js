const mongoose = require('mongoose');
const { Schema } = mongoose;
const administrativeFields = require('../common/administrativeFields');
const localizedField = require('../common/localizedField');
const localizedArrayField = require('../common/localizedArrayField');

const SegmentSchema = new Schema({

    //Textual name and description
    name: localizedField('name'),
    description: localizedField('description'),
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

    //The specific document the Segment came from
    documentUuid: {
        type: String,
    },

    //Position from the original document
    cursorStart: { type: Number },
    cursorEnd: { type: Number },

    htmlContent: { type: String, }, //Converted to HTML
    htmlLength: { type: Number, },
    textContent: { type: String, }, //Converted to Text
    textLength: { type: Number, },

    
    //Tags to organize the Segments 
    tagUuids: {
        type: [String],
        default: []
    },


    ...administrativeFields
}, {
    collection: 'segments',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Segment = mongoose.model('Segment', SegmentSchema);
module.exports = Segment;
