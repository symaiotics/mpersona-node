const mongoose = require('mongoose');
const { Schema } = mongoose;
const administrativeFields = require('../common/administrativeFields');
const localizedField = require('../common/localizedField');
const localizedArrayField = require('../common/localizedArrayField');


const DocumentSchema = new Schema({
    //Textual name and description
    name: localizedField('name'),
    description: localizedField('description'),
    keywords: localizedArrayField('keywords'),
    categories: { type: Array },
    // categoryScores: {
    //     type: [{
    //         categoryUuid: { type: String, required: true },
    //         en: { type: String, trim: true },
    //         fr: { type: String, trim: true },
    //         score: { type: Number, default: null }
    //     }],
    //     validate: {
    //         validator: function (array) {
    //             return array.every(item => item.categoryUuid && (item.en || item.fr));
    //         },
    //         message: 'Each category score must have a `categoryUuid` and at least one of `en` or `fr` provided.'
    //     },
    //     default: []
    // },

    //Original file information
    original: {
        name: { type: String, },
        type: { type: String, },
        size: { type: Number, },
        lastModified: { type: Date, },
    },

    //Derived information
    imgSrc: { type: String, }, //The generated image
    htmlContent: { type: String, }, //Converted to HTML
    htmlLength: { type: Number, },
    textContent: { type: String, }, //Converted to Text
    textLength: { type: Number, },

    //Original Uploaded file
    storageUrl: { type: String },

    //Generated image preview by mammoth + html2canvas
    imgStorageUrl: { type: String },

    //Tags to organize the Docunments 
    tagUuids: {
        type: [String],
        default: []
    },


    ...administrativeFields
}, {
    collection: 'documents',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Document = mongoose.model('Document', DocumentSchema);
module.exports = Document;
