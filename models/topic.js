const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the schema for the topics
const topicSchema = new mongoose.Schema({
    topic: { type: String, required: true, unique: true },
    categories: [{ type: String }]
});

// Define the mongoose model
module.exports = mongoose.model('Topic', topicSchema);


