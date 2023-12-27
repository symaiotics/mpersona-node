const mongoose = require('mongoose');
const { Schema } = mongoose;

const administrativeFields = require('../common/administrativeFields');
const localizedField = require('../common/localizedField');
// const localizedArrayField = require('../common/localizedArrayField');

const CategorySchema = new Schema({

    //Textual name and description
    name: localizedField('name'),
    description: localizedField('description'),

    //A longer text to describe how this category should be used in classification
    context: localizedField('context'),

    // Localized keywords
    // keywords: localizedArrayField('keywords'),

    ...administrativeFields
}, {
    collection: 'metadataCategories',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Category = mongoose.model('Category', CategorySchema);
module.exports = Category;
