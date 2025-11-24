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

// Add indexes for better query performance
photoSchema.index({ roomId: 1, processed: 1 });
photoSchema.index({ uploaderId: 1 });
photoSchema.index({ createdAt: -1 });
photoSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Photo', photoSchema);
