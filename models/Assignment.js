const mongoose = require('mongoose');
const { Schema } = mongoose;
const administrativeFields = require('./common/administrativeFields');
const localizedField = require('./common/localizedField');
const AssignmentSchema = new Schema({
    //Textual name and description
    code: { type: String, trim: true },
    name: localizedField('name'),
    personaUuid: { type: String, required: true },
    wrappUuid: { type: String },
    rosterUuid: { type: String },

    ...administrativeFields
}, {
    collection: 'assignments',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

const Assignment = mongoose.model('Assignment', AssignmentSchema);
module.exports = Assignment;
