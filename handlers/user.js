const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');
const sendNote = require('../utils/sendNote');
const searchNotesByKeyword = require('../utils/searchNotes');
const getAllKeywords = require('../utils/availableKeywords');
const escapeMarkdownV2 = require('../utils/escapeMarkdownV2');

const userSearchStep = {}; // track user search state

async function showUserMenu(ctx) {
  try {
    const categories = await Category.find().lean();

    if (categories.length === 0) {
      return ctx.reply('No categories found.');
    }

    const buttons = categories.map(cat => [Markup.button.callback(cat.name, `user_cat_${cat._id}`)]);
    buttons.push([Markup.button.callback('🔍 Search notes', 'search_note')]);

    return ctx.reply('📁 Choose a category or search notes:', Markup.inlineKeyboard(buttons));
  } catch (err) {
    console.error('Error in showUserMenu:', err);
    return ctx.reply('Failed to load categories.');
  }
}

async function handleUserActions(ctx) {
  try {
    if (ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;

      if (data.startsWith('user_cat_')) {
        const categoryId = data.replace('user_cat_', '');
        const notes = await Note.find({ category: categoryId }).lean();

        if (notes.length === 0) {
          await ctx.reply('No notes found in this category.');
        } else {
          for (const note of notes) {
            await sendNote(ctx, note);
          }
        }
        await showUserMenu(ctx);
        return ctx.answerCbQuery();

      } else if (data === 'search_note' || ctx.message.text === "/search") {
        userSearchStep[ctx.from.id] = 'awaiting_search_keyword';
        await ctx.reply('Please enter the keyword to search for notes:');
        return ctx.answerCbQuery();
      }

      return ctx.answerCbQuery();
    }

    if (ctx.message) {
      const userId = ctx.from.id;
      const messageText = ctx.message.text?.trim();

      // Handle /available_keywords command
      if (messageText === '/available_keywords') {
        const keywords = await getAllKeywords();

        if (keywords.length === 0) {
          return ctx.reply('🚫 No keywords found.');
        }

        const formatted = keywords.map(k => `\`${escapeMarkdownV2(k)}\``).join(', ');
        return ctx.reply(`🔑 Available keywords:\n${formatted}`, { parse_mode: 'MarkdownV2' });
      }

      // Handle keyword search
      if (userSearchStep[userId] === 'awaiting_search_keyword') {
        if (!messageText) {
          return ctx.reply('❗ Please enter a valid keyword.');
        }

        const results = await searchNotesByKeyword(messageText);
        if (results.length === 0) {
          await ctx.reply('🔍 No notes found for this keyword.');
        } else {
          for (const note of results) {
            await sendNote(ctx, note);
          }
        }

        userSearchStep[userId] = null;
        return showUserMenu(ctx);
      } else {
        // Fallback keyword search for users not in search state
        const keyword = messageText;
        const results = await searchNotesByKeyword(keyword);

        if (!results.length) return ctx.reply('🔍 No notes found for this keyword.');

        for (const note of results) await sendNote(ctx, note);
      }
    }
  } catch (err) {
    console.error('Error in handleUserActions:', err);
    return ctx.reply('An error occurred while processing your request.');
  }
}

module.exports = {
  showUserMenu,
  handleUserActions
};
