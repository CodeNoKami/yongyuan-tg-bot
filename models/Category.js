const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: String,
    createdBy: String
});

module.exports = mongoose.model('Category', categorySchema);
