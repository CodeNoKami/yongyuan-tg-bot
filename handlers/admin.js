// admin.js
const { Markup } = require('telegraf');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Note = require('../models/Note');
const sendNote = require('../utils/sendNote');

const step = {};
const tempData = {};
const editingNote = {};

// Link extraction regex
const linkRegex = /(https?:\/\/[^\s]+)/g;

async function showAdminMenu(ctx) {
  try {
    const categories = await Category.find().lean();
    const buttons = [
      [Markup.button.callback('➕ Add Category', 'add_category')],
      [Markup.button.callback('📝 Add Note', 'add_note')],
      [Markup.button.callback('✏️ Edit Note', 'edit_note')],
      [Markup.button.callback('❌ Delete Category', 'delete_category')],
      [Markup.button.callback('🗑 Delete Note', 'delete_note')]
    ];
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
        return ctx.answerCbQuery(); // In admin mode, we ignore category viewing
      } else if (data === 'add_category') {
        step[chatId] = 'awaiting_category_name';
        return ctx.reply('🆕 Send the category name:');

      } else if (data === 'add_note') {
        const categories = await Category.find().lean();
        if (categories.length === 0) {
          await showAdminMenu(ctx);
          return ctx.reply('No categories found. Add a category first.');
        }
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `note_cat_${cat._id}`)]);
        step[chatId] = 'awaiting_note_category';
        return ctx.reply('Choose a category for the new note:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('note_cat_')) {
        tempData[chatId] = { categoryId: data.replace('note_cat_', ''), text: '', links: [], fileIds: [], photoIds: [] };
        step[chatId] = 'awaiting_note_content';
        return ctx.reply('Now send the note content (you can send multiple messages — type /done when finished):');

      } else if (data === 'edit_note') {
        const categories = await Category.find().lean();
        if (categories.length === 0) return ctx.reply('No categories found.');

        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `edit_note_cat_${cat._id}`)]);
        step[chatId] = 'awaiting_edit_note_category';
        return ctx.reply('Choose category to edit notes from:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('edit_note_cat_')) {
        const categoryId = data.replace('edit_note_cat_', '');
        const notes = await Note.find({ category: categoryId }).lean();

        if (notes.length === 0) return ctx.reply('No notes found.');

        const buttons = notes.map(note => {
          const title = note.text ? (note.text.length > 20 ? note.text.slice(0, 20) + '...' : note.text) : 'Note';
          return [Markup.button.callback(title, `edit_note_${note._id}`)];
        });

        return ctx.reply('Choose a note to edit:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('edit_note_')) {
        const noteId = data.replace('edit_note_', '');
        if (!mongoose.Types.ObjectId.isValid(noteId)) return ctx.reply('❌ Invalid note ID.');

        const note = await Note.findById(noteId).lean();
        if (!note) return ctx.reply('Note not found.');

        editingNote[chatId] = { ...note };
        step[chatId] = 'editing_note_field';

        const buttons = [
          [Markup.button.callback('✏️ Edit Text', 'edit_field_text')],
          [Markup.button.callback('🔗 Edit Links', 'edit_field_links')],
          [Markup.button.callback('📁 Edit Files', 'edit_field_files')],
          [Markup.button.callback('🖼 Edit Photos', 'edit_field_photos')],
          [Markup.button.callback('✅ Save Changes', 'edit_note_save')]
        ];

        return ctx.reply('Select field to edit:', Markup.inlineKeyboard(buttons));

      } else if (data === 'edit_field_text') {
        step[chatId] = 'editing_note_text';
        return ctx.reply('✏️ Send new text:');

      } else if (data === 'edit_field_links') {
        step[chatId] = 'editing_note_links';
        return ctx.reply('🔗 Send new links separated by space:');

      } else if (data === 'edit_field_files') {
        step[chatId] = 'editing_note_files';
        editingNote[chatId].fileIds = [];
        return ctx.reply('📁 Send new files (type /done when finished):');

      } else if (data === 'edit_field_photos') {
        step[chatId] = 'editing_note_photos';
        editingNote[chatId].photoIds = [];
        return ctx.reply('🖼 Send new photos (type /done when finished):');

      } else if (data === 'edit_note_save') {
        const note = editingNote[chatId];
        await Note.findByIdAndUpdate(note._id, {
          text: note.text,
          links: note.links,
          fileIds: note.fileIds,
          photoIds: note.photoIds
        });
        step[chatId] = null;
        editingNote[chatId] = null;
        await showAdminMenu(ctx);
        return ctx.reply('✅ Note updated successfully.');
      }

      return ctx.answerCbQuery();
    }

    if (ctx.message) {
      if (step[chatId] === 'awaiting_category_name') {
        const categoryName = ctx.message.text?.trim();
        if (!categoryName) return ctx.reply('Category name cannot be empty. Please send a valid name.');
        await Category.create({ name: categoryName });
        step[chatId] = null;
        await showAdminMenu(ctx);
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
            await Note.create({ category: categoryId, text, links, fileIds, photoIds });
            step[chatId] = null;
            tempData[chatId] = {};
            await showAdminMenu(ctx);
            return ctx.reply('✅ Note saved.');
          }
          tempData[chatId].text += (tempData[chatId].text ? '\n' : '') + message.text;
          const foundLinks = message.text.match(linkRegex);
          if (foundLinks) tempData[chatId].links.push(...foundLinks);

        } else if (message.document) {
          tempData[chatId].fileIds.push(message.document.file_id);

        } else if (message.photo) {
          tempData[chatId].photoIds.push(message.photo[message.photo.length - 1].file_id);

        } else return ctx.reply('Unsupported message type. Please send text, link, document, or photo.');

        return ctx.reply('✅ Part added. Continue or type /done to save.');

      } else if (step[chatId] === 'editing_note_text') {
        editingNote[chatId].text = ctx.message.text;
        step[chatId] = 'editing_note_field';
        return ctx.reply('✅ Text updated. Choose next field or save.', Markup.inlineKeyboard([
          [Markup.button.callback('✅ Save Changes', 'edit_note_save')]
        ]));

      } else if (step[chatId] === 'editing_note_links') {
        editingNote[chatId].links = ctx.message.text.match(linkRegex) || [];
        step[chatId] = 'editing_note_field';
        return ctx.reply('✅ Links updated. Choose next field or save.', Markup.inlineKeyboard([
          [Markup.button.callback('✅ Save Changes', 'edit_note_save')]
        ]));

      } else if (step[chatId] === 'editing_note_files') {
        if (ctx.message.document) {
          editingNote[chatId].fileIds.push(ctx.message.document.file_id);
          return ctx.reply('📁 File added. Send more or type /done.');
        } else if (ctx.message.text === '/done') {
          step[chatId] = 'editing_note_field';
          return ctx.reply('✅ Files updated. Choose next field or save.', Markup.inlineKeyboard([
            [Markup.button.callback('✅ Save Changes', 'edit_note_save')]
          ]));
        }

      } else if (step[chatId] === 'editing_note_photos') {
        if (ctx.message.photo) {
          editingNote[chatId].photoIds.push(ctx.message.photo[ctx.message.photo.length - 1].file_id);
          return ctx.reply('🖼 Photo added. Send more or type /done.');
        } else if (ctx.message.text === '/done') {
          step[chatId] = 'editing_note_field';
          return ctx.reply('✅ Photos updated. Choose next field or save.', Markup.inlineKeyboard([
            [Markup.button.callback('✅ Save Changes', 'edit_note_save')]
          ]));
        }
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
