const mongoose = require('mongoose');
const { Schema } = mongoose;
const administrativeFields = require('../common/administrativeFields');
const localizedField = require('../common/localizedField');

const MappingSchema = new Schema({
    //Textual name and description
    name: localizedField('name'),
    description: localizedField('description'),

    documentUuids: {
        type: [String],
        default: []
    },

    segmentUuids: {
        type: [String],
        default: []
    },

    //Tags to organize the Mappings 
    tagUuids: {
        type: [String],
        default: []
    },

    ...administrativeFields
}, {
    collection: 'Mappings',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Mapping = mongoose.model('Mapping', MappingSchema);
module.exports = Mapping;
