const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    ownerId: {
        type: String,
        required: true,
        ref: 'User'
    },
    code: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    eventDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
roomSchema.index({ ownerId: 1 });
roomSchema.index({ createdAt: -1 });
roomSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Room', roomSchema);
