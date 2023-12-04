var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define the schema for words in the lexicon
var MailingListSchema = new Schema({
    emailAddress: {
        type: String,
        required: true,
        index: true // Add an index to improve search on this field
    },

}, {
    collection: 'mailinglists',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});


const MailingList = mongoose.model('MailingList', MailingListSchema);
module.exports = MailingList;
 