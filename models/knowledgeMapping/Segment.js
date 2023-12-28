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
    categories: { type: Array },

    //Document source
    //This is point in time, but just in case the parent document is deleted, to keep a reference
    documentName: localizedField('name'),
    documentDescription: localizedField('description'),
    documentUuid: { //The specific document the Segment came from
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
