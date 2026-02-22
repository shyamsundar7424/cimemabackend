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
        type: String, // Legacy — kept for backward compat
        default: '',
    },
    trailerLink: {
        type: String, // YouTube embed URL or MP4 link
        default: '',
    },
    downloadLink: {
        type: String, // Main download link
        default: '',
    },
    fastDownloadLink: {
        type: String, // Fast server download link
        default: '',
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
