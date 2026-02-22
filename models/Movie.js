const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    image: {
        type: String, // URL to image
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    movieLink: {
        type: String, // Download link
        required: true,
    },
    year: {
        type: String,
        default: '',
    },
    rating: {
        type: String, // e.g. "8.5/10"
        default: '',
    },
    director: {
        type: String,
        default: '',
    },
    cast: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Movie', MovieSchema);
