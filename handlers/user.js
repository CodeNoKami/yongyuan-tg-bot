const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');

async function handleUserCommands(ctx) {
  try {
    const categories = await Category.find().lean();

    if (!categories.length) {
      return ctx.reply('No categories available yet.');
    }

    // Map categories to buttons with callback_data = user_cat_<categoryId>
    const buttons = categories.map(cat =>
      [Markup.button.callback(cat.name, `user_cat_${cat._id}`)]
    );

    return ctx.reply('📁 Choose a category:', Markup.inlineKeyboard(buttons));
  } catch (err) {
    console.error('Error in handleUserCommands:', err);
    await ctx.reply('Sorry, something went wrong fetching categories.');
  }
}

async function handleUserCategory(ctx) {
  try {
    const data = ctx.callbackQuery?.data;
    console.log('handleUserCategory called with data:', data);

    if (!data || !data.startsWith('user_cat_')) {
      await ctx.answerCbQuery('Invalid category selection.', { show_alert: true });
      return;
    }

    const categoryId = data.replace('user_cat_', '');
    const notes = await Note.find({ category: categoryId }).lean();

    if (!notes.length) {
      await ctx.reply('No notes found in this category.');
      await ctx.answerCbQuery();
      return;
    }

    for (const note of notes) {
      let messageParts = [];
      if (note.text) messageParts.push(note.text);
      if (note.link) messageParts.push(note.link);

      if (messageParts.length) {
        await ctx.reply(messageParts.join('\n'));
      }
      if (note.fileId) await ctx.replyWithDocument(note.fileId);
      if (note.photoId) await ctx.replyWithPhoto(note.photoId);
    }

    await ctx.answerCbQuery();
  } catch (err) {
    console.error('Error in handleUserCategory:', err);
    await ctx.answerCbQuery('Failed to fetch notes.', { show_alert: true });
  }
}

module.exports = {
  handleUserCommands,
  handleUserCategory,
};
