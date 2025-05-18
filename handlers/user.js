const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');

async function showUserMenu(ctx) {
  try {
    const categories = await Category.find().lean();

    if (categories.length === 0) {
      return ctx.reply('No categories found.');
    }

    const buttons = categories.map(cat => [Markup.button.callback(cat.name, `user_cat_${cat._id}`)]);
    return ctx.reply('📁 Choose a category:', Markup.inlineKeyboard(buttons));
  } catch (err) {
    console.error('Error in showUserMenu:', err);
    return ctx.reply('Failed to load categories.');
  }
}

async function handleUserActions(ctx) {
  try {
    if (!ctx.callbackQuery) {
      return;
    }

    const data = ctx.callbackQuery.data;

    if (data.startsWith('user_cat_')) {
      const categoryId = data.replace('user_cat_', '');
      const notes = await Note.find({ category: categoryId }).lean();

      if (notes.length === 0) {
        await ctx.reply('No notes found in this category.');
      } else {
        for (const note of notes) {
          if (note.text) await ctx.reply(note.text);
          if (note.link) await ctx.reply(note.link);
          if (note.fileId) await ctx.replyWithDocument(note.fileId);
          if (note.photoId) await ctx.replyWithPhoto(note.photoId);
        }
      }

      return ctx.answerCbQuery();
    }

    // If callback data doesn't match expected pattern, just answer callback query to remove loading state
    return ctx.answerCbQuery();

  } catch (err) {
    console.error('Error in handleUserActions:', err);
    return ctx.reply('An error occurred while processing your request.');
  }
}

module.exports = {
  showUserMenu,
  handleUserActions
};
