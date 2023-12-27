//Knowledge Sets is the parent element which coordinates the rest.
//Categories - Defined Categories
//Documents - Full uploaded documents with image preview
//Segments - Extracts from the text of a document
//Tags - Metadata for describing Documents and Segments
//Mappings - Groups of DOcuments and Segments
//Artifacts - Generated content

const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const administrativeFields = require('../common/administrativeFields');
const localizedField = require('../common/localizedField');

const KnowledgeSetSchema = new Schema({

    name: localizedField('name'),
    description: localizedField('description'),

    //Associated artifacts
    //AI Generated
    artifactUuids: {
        type: [String],
        default: []
    },

    //Categories
    categoryUuids: {
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

    //Sets of DOcuments and Segment
    mappingUuids: {
        type: [String],
        default: []
    },

    //Tags to organize the Segments
    tagUuids: {
        type: [String],
        default: []
    },

    ...administrativeFields

}, {
    collection: 'knowledgeSets',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const KnowledgeSet = mongoose.model('KnowledgeSet', KnowledgeSetSchema);
module.exports = KnowledgeSet;
