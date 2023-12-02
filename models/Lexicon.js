var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define the schema for words in the lexicon
var LexiconSchema = new Schema({
    code: {
        type: String,
        required: true,
        index: true // Add an index to improve search on this field
    },
    word: {
        type: Map,
        of: String, // The 'of' option specifies the type of the map's values, in this case, strings for each language.
        required: true // You can make this field required if every word must have at least one translation.
    },
    keywords: {
        type: [String],
        index: true // Optionally index the keywords array for better search performance
    },
    autoTranslated: {
        type: Boolean,
        default:false
    },
    validatedBy: { //username of validator
        type: String,
    }

}, {
    collection: 'lexicon',
    timestamps: { createdAt: 'momentCreated', updatedAt: 'momentUpdated' } // Use custom field names for timestamps
});

module.exports = mongoose.model('Lexicon', LexiconSchema);