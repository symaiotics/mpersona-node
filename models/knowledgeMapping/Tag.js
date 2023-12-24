
const mongoose = require('mongoose');
const { Schema } = mongoose;

const administrativeFields = require('./administrativeFields');
const localizedField = require('./localizedField');

const TagSchema = new Schema({
    //Textual name and description
    name: localizedField('name'),
    description: localizedField('description'),
    ...administrativeFields
}, {
    collection: 'tags',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Tag = mongoose.model('Tag', TagSchema);
module.exports = Tag;
