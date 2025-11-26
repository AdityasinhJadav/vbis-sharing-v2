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
    },
    eventDate: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Room', roomSchema);
