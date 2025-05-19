const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    text: String,
    links: [String],
    fileIds: [String],
    photoIds: [String],
    keywords: {
        type: [String],
        default: []
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Note', NoteSchema);
