// utils/searchNotes.js
const Note = require('../models/Note');

async function searchNotesByKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') return [];

  const trimmedKeyword = keyword.replace('#', '').trim();
  if (!trimmedKeyword) return [];

  // case-insensitive partial match for keywords array elements
  const regex = new RegExp(trimmedKeyword, 'i');

  return await Note.find({
    keywords: { $elemMatch: { $regex: regex } }
  }).lean();
}

module.exports = searchNotesByKeyword;
