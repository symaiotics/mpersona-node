const mongoose = require('mongoose');
const { Schema } = mongoose;

const guestSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    biographicalInfo: {
        type: String,
        required: false
    },
    biographicalTopics: {
        type: [String],
        required: false
    }
});

const podcastSchema = new Schema({
    id: {
        type: String,
        required: false,
        unique: true
    },
    channelSearch: {
        type: String,
        required: false,
        unique: false
    },
    guests: {
        type: [guestSchema],
        required: false
    },
    topics: {
        type: [String],
        required: false
    },
    host: {
        type: String,
        required: false
    },
    podcastName: {
        type: String,
        required: false
    },
    episodeNumber: {
        type: Number,
        required: false
    },
    other: {
        type: [String],
        required: false
    },
    img: {
        type: String,
        required: false
    },
    title: {
        type: String,
        required: false
    }
});
module.exports = mongoose.model('Podcast', podcastSchema);