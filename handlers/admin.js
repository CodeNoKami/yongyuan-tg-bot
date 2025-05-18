// admin.js
const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');
const sendNote = require('../utils/sendNote');

const step = {};
const tempData = {};

async function showAdminMenu(ctx) {
  try {
    const categories = await Category.find().lean();
    const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat._id}`)]);
    buttons.push([Markup.button.callback('➕ Add Category', 'add_category')]);
    buttons.push([Markup.button.callback('📝 Add Note', 'add_note')]);
    buttons.push([Markup.button.callback('❌ Delete Category', 'delete_category')]);
    buttons.push([Markup.button.callback('🗑 Delete Note', 'delete_note')]);

    return ctx.reply('📋 Admin Menu:', Markup.inlineKeyboard(buttons));
  } catch (err) {
    console.error('Error in showAdminMenu:', err);
    return ctx.reply('Failed to load admin menu.');
  }
}

async function handleAdminActions(ctx) {
  const chatId = ctx.from.id.toString();

  try {
    if (ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;

      if (data.startsWith('cat_')) {
        const categoryId = data.replace('cat_', '');
        const notes = await Note.find({ category: categoryId }).lean();

        if (notes.length === 0) {
          await ctx.reply('No notes found in this category.');
        } else {
          for (const note of notes) {
            await sendNote(ctx, note);
          }
        }
        return ctx.answerCbQuery();

      } else if (data === 'add_category') {
        step[chatId] = 'awaiting_category_name';
        return ctx.reply('🆕 Send the category name:');

      } else if (data === 'add_note') {
        const categories = await Category.find().lean();
        if (categories.length === 0) {
          return ctx.reply('No categories found. Add a category first.');
        }
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `note_cat_${cat._id}`)]);
        step[chatId] = 'awaiting_note_category';
        return ctx.reply('Choose a category for the new note:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('note_cat_')) {
        tempData[chatId] = { categoryId: data.replace('note_cat_', ''), text: '', links: [], fileIds: [], photoIds: [] };
        step[chatId] = 'awaiting_note_content';
        return ctx.reply('Now send the note content (you can send multiple messages — type /done when finished):');

      } else if (data === 'delete_category') {
        const categories = await Category.find().lean();
        if (categories.length === 0) {
          return ctx.reply('No categories found.');
        }
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `del_cat_${cat._id}`)]);
        step[chatId] = 'awaiting_delete_category';
        return ctx.reply('Select category to delete:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('del_cat_')) {
        const categoryId = data.replace('del_cat_', '');
        await Note.deleteMany({ category: categoryId });
        await Category.findByIdAndDelete(categoryId);
        step[chatId] = null;
        return ctx.reply('✅ Category and its notes deleted.');

      } else if (data === 'delete_note') {
        const categories = await Category.find().lean();
        if (categories.length === 0) {
          return ctx.reply('No categories found.');
        }
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `del_note_cat_${cat._id}`)]);
        step[chatId] = 'awaiting_delete_note_category';
        return ctx.reply('Select category to delete notes from:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('del_note_cat_')) {
        const categoryId = data.replace('del_note_cat_', '');
        const notes = await Note.find({ category: categoryId }).lean();

        if (notes.length === 0) {
          step[chatId] = null;
          return ctx.reply('No notes found in this category.');
        }

        const buttons = notes.map(note => {
          const title = note.text ? (note.text.length > 20 ? note.text.slice(0, 20) + '...' : note.text) : 'Note';
          return [Markup.button.callback(title, `del_note_${note._id}`)];
        });

        step[chatId] = 'awaiting_delete_note';
        tempData[chatId] = { notes, categoryId };
        return ctx.reply('Select note to delete:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('del_note_')) {
        const noteId = data.replace('del_note_', '');
        await Note.findByIdAndDelete(noteId);
        step[chatId] = null;
        return ctx.reply('✅ Note deleted.');
      }

      return ctx.answerCbQuery();
    }

    if (ctx.message) {
      if (step[chatId] === 'awaiting_category_name') {
        const categoryName = ctx.message.text?.trim();
        if (!categoryName) {
          return ctx.reply('Category name cannot be empty. Please send a valid name.');
        }
        await Category.create({ name: categoryName });
        step[chatId] = null;
        return ctx.reply('✅ Category added.');

      } else if (step[chatId] === 'awaiting_note_content') {
        const { categoryId } = tempData[chatId] || {};
        if (!categoryId) {
          step[chatId] = null;
          return ctx.reply('Category not selected. Please start over.');
        }

        const message = ctx.message;
        if (message.text) {
          if (message.text === '/done') {
            const { text, links, fileIds, photoIds } = tempData[chatId];
            const noteData = {
              category: categoryId,
              text,
              links,
              fileIds,
              photoIds
            };
            await Note.create(noteData);
            step[chatId] = null;
            tempData[chatId] = {};
            return ctx.reply('✅ Note saved.');
          }
          tempData[chatId].text += (tempData[chatId].text ? '\n' : '') + message.text;
          if (message.entities?.some(e => e.type === 'url')) {
            tempData[chatId].links.push(message.text);
          }
        } else if (message.document) {
          tempData[chatId].fileIds.push(message.document.file_id);
        } else if (message.photo) {
          tempData[chatId].photoIds.push(message.photo[message.photo.length - 1].file_id);
        } else {
          return ctx.reply('Unsupported message type. Please send text, link, document, or photo.');
        }

        return ctx.reply('✅ Part added. Continue or type /done to save.');
      }
    }

  } catch (err) {
    console.error('Error in handleAdminActions:', err);
    return ctx.reply('An error occurred. Please try again.');
  }
}

module.exports = {
  showAdminMenu,
  handleAdminActions
};
