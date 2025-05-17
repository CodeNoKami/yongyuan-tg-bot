const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    userId: String,
    messageType: String,
    content: String,
    fileId: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', noteSchema);
