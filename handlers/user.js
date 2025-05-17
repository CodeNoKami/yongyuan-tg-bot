const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');

async function handleUserCommands(ctx) {
  try {
    const categories = await Category.find().lean();
    if (categories.length === 0) {
      return ctx.reply('😕 No categories available.');
    }

    const buttons = categories.map(cat =>
      [Markup.button.callback(cat.name, `user_cat_${cat._id}`)]
    );

    return ctx.reply('📁 Choose a category:', Markup.inlineKeyboard(buttons));
  } catch (err) {
    console.error('Error loading categories for user:', err);
    return ctx.reply('⚠️ Failed to load categories.');
  }
}

async function handleUserCategory(ctx) {
  try {
    const data = ctx.callbackQuery?.data;
    if (data?.startsWith('user_cat_')) {
      const categoryId = data.replace('user_cat_', '');
      const notes = await Note.find({ category: categoryId }).lean();

      if (notes.length === 0) {
        await ctx.reply('📭 No notes found in this category.');
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
  } catch (err) {
    console.error('Error handling user category:', err);
    return ctx.reply('⚠️ Failed to load notes.');
  }
}

module.exports = {
  handleUserCommands,
  handleUserCategory
};
