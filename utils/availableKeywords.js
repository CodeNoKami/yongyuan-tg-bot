const Note = require('../models/Note');

async function getAllKeywords() {
  const notes = await Note.find({}, 'keywords').lean();
  const keywordSet = new Set();

  for (const note of notes) {
    if (Array.isArray(note.keywords)) {
      note.keywords.forEach(k => keywordSet.add(k));
    }
  }

  return Array.from(keywordSet).sort(); // sorted alphabetically
}

module.exports = getAllKeywords;
