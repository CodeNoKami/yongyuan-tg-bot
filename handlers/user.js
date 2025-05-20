const escapeMarkdownV2 = require('../utils/escapeMarkdownV2');
const searchNotesByKeyword = require('../utils/searchNotes');
const sendNote = require('../utils/sendNote');

async function handleUserMessage(ctx) {
  try {
    const messageText = ctx.message?.text;

    if (!messageText) return;

    // Handle keyword search from users
    const keyword = messageText.split(' ')[1] || messageText;
    const results = await searchNotesByKeyword(keyword);

    if (!results.length) return ctx.reply('🔍 No notes found for this keyword.');

    for (const note of results) await sendNote(ctx, note);

  } catch (err) {
    console.error('Error in handleUserMessage:', err);
    return ctx.reply('Something went wrong while processing your request.');
  }
}

async function handleAvailableKeywords(ctx) {
  try {
    const getAllKeywords = require('../utils/availableKeywords');
    const keywords = await getAllKeywords();

    if (!keywords.length) return ctx.reply('🚫 No keywords found.');

    const formatted = keywords.map(k => `\`${escapeMarkdownV2(k)}\``).join(', ');
    return ctx.reply(`🔑 Available keywords:\n${formatted}`, { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Error in handleAvailableKeywords:', err);
    return ctx.reply('Failed to fetch available keywords.');
  }
}

module.exports = { handleUserMessage, handleAvailableKeywords };
