const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    text: String,
    link: String,
    fileId: String,
    photoId: String
});

module.exports = mongoose.model('Note', NoteSchema);

