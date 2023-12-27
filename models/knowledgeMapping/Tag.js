
const mongoose = require('mongoose');
const { Schema } = mongoose;

const administrativeFields = require('../common/administrativeFields');
const localizedField = require('../common/localizedField');

const TagSchema = new Schema({
    //Textual name and description
    name: localizedField('name'),
  
    ...administrativeFields
}, {
    collection: 'metadataTags',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Tag = mongoose.model('Tag', TagSchema);
module.exports = Tag;
