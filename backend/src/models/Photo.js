const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    roomId: {
        type: String,
        required: true,
        ref: 'Room'
    },
    uploaderId: {
        type: String,
        ref: 'User'
    },
    url: {
        type: String,
        required: true
    },
    publicId: {
        type: String
    },
    originalName: {
        type: String
    },
    descriptor: {
        type: [Number], // Array of 128 floats
        default: []
    },
    processed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Photo', photoSchema);
