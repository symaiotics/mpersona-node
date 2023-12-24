const mongoose = require('mongoose');
const { Schema } = mongoose;
const administrativeFields = require('./administrativeFields');
const localizedField = require('./localizedField');

const AssignmentSchema = new Schema({

    //Textual name and description
    name: localizedField('name'),
    description: localizedField('description'),

    //The specific document the Assignment came from
    assignments: {
        type: [{
            personaUuid: { type: String, required: true },
            code: { type: String, trim: true },
            en: { type: String, trim: true },
            fr: { type: String, trim: true },
        }],
        validate: {
            validator: function (array) {
                return array.every(item => item.personaUuid && item.code && (item.en || item.fr));
            },
            message: 'Each assignment must have a `personaUuid` and at least one of `en` or `fr` provided.'
        },
        default: []
    },

    ...administrativeFields
}, {
    collection: 'assignments',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Assignment = mongoose.model('Assignment', AssignmentSchema);
module.exports = Assignment;
