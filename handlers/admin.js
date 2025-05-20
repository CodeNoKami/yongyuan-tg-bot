const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');
const sendNote = require('../utils/sendNote');
const searchNotesByKeyword = require('../utils/searchNotes');
const getAllKeywords = require('../utils/availableKeywords');
const escapeMarkdownV2 = require('../utils/escapeMarkdownV2');

const step = {};
const tempData = {};
const linkRegex = /(https?:\/\/[^\s]+)/g;

async function showAdminMenu(ctx) {
  try {
    const categories = await Category.find().lean();
    const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat._id}`)]);
    buttons.push(
      [Markup.button.callback('➕ Add New Category', 'add_category')],
      [Markup.button.callback('📝 Add New Note', 'add_note')],
      [Markup.button.callback('❌ Delete Category', 'delete_category')],
      [Markup.button.callback('🗑 Delete Note', 'delete_note')],
      [Markup.button.callback('🔍 Search Notes', 'search_note')]
    );
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
      await ctx.answerCbQuery();

      if (data.startsWith('cat_')) {
        const categoryId = data.split('_')[1];
        const notes = await Note.find({ category: categoryId }).lean();
        if (notes.length === 0) await ctx.reply('No notes found in this category.');
        else for (const note of notes) await sendNote(ctx, note);
        return showAdminMenu(ctx);

      } else if (data === 'add_category') {
        step[chatId] = 'awaiting_category_name';
        return ctx.reply('🆕 Send the category name:');

      } else if (data === 'add_note') {
        const categories = await Category.find().lean();
        if (!categories.length) {
          await ctx.reply('No categories found. Add a category first.');
          return showAdminMenu(ctx);
        }
        step[chatId] = 'awaiting_note_category';
        return ctx.reply('Choose a category for the new note:', Markup.inlineKeyboard(categories.map(cat => [Markup.button.callback(cat.name, `note_cat_${cat._id}`)])));

      } else if (data.startsWith('note_cat_')) {
        tempData[chatId] = {
          categoryId: data.split('_')[2],
          text: '',
          links: [],
          fileIds: [],
          photoIds: [],
          keywords: []
        };
        step[chatId] = 'awaiting_note_content';
        return ctx.reply('Now send the note content (multiple messages allowed — type /done when finished):');

      } else if (data === 'delete_category') {
        const categories = await Category.find().lean();
        if (!categories.length) return ctx.reply('No categories found.');
        step[chatId] = 'awaiting_delete_category';
        return ctx.reply('Select category to delete:', Markup.inlineKeyboard(categories.map(cat => [Markup.button.callback(cat.name, `del_cat_${cat._id}`)])));

      } else if (data.startsWith('del_cat_')) {
        await Note.deleteMany({ category: data.split('_')[2] });
        await Category.findByIdAndDelete(data.split('_')[2]);
        step[chatId] = null;
        await ctx.reply('✅ Category and its notes deleted.');
        return showAdminMenu(ctx);

      } else if (data === 'delete_note') {
        const categories = await Category.find().lean();
        if (!categories.length) {
          await ctx.reply('No categories found.');
          return showAdminMenu(ctx);
        }
        step[chatId] = 'awaiting_delete_note_category';
        return ctx.reply('Select category to delete notes from:', Markup.inlineKeyboard(categories.map(cat => [Markup.button.callback(cat.name, `del_note_cat_${cat._id}`)])));

      } else if (data.startsWith('del_note_cat_')) {
        const categoryId = data.split('_')[3];
        const notes = await Note.find({ category: categoryId }).lean();
        if (!notes.length) {
          step[chatId] = null;
          await ctx.reply('No notes found in this category.');
          return showAdminMenu(ctx);
        }
        tempData[chatId] = { notes, categoryId };
        step[chatId] = 'awaiting_delete_note';
        return ctx.reply('Select note to delete:', Markup.inlineKeyboard(notes.map(note => [Markup.button.callback((note.text?.slice(0, 20) || 'Note') + (note.text?.length > 20 ? '...' : ''), `del_note_${note._id}`)])));

      } else if (data.startsWith('del_note_')) {
        await Note.findByIdAndDelete(data.split('_')[2]);
        step[chatId] = null;
        await ctx.reply('✅ Note deleted.');
        return showAdminMenu(ctx);

      } else if (data === 'search_note') {
        step[chatId] = 'awaiting_search_keyword';
        return ctx.reply('🔍 Send a keyword to search notes:');
      }
    }

    if (ctx.message) {
      const messageText = ctx.message.text;

      if (messageText === '/available_keywords') {
        const keywords = await getAllKeywords();
        if (!keywords.length) {
          return ctx.reply('🚫 No keywords found.');
        }
        const formatted = keywords.map(k => `\\\`${escapeMarkdownV2(k)}\\\``).join(', ');
        return ctx.reply(`🔑 Available keywords:\n${formatted}`, { parse_mode: 'MarkdownV2' });
      }

      if ((messageText?.startsWith('/search') || step[chatId] === 'awaiting_search_keyword') && step[chatId] !== 'awaiting_note_keywords') {
        const keyword = messageText.split(' ')[1] || messageText;
        if (!keyword) return ctx.reply('❗️Please provide a keyword.');
        const results = await searchNotesByKeyword(keyword);
        if (!results.length) return ctx.reply('🔍 No notes found for this keyword.');
        for (const note of results) await sendNote(ctx, note);
        step[chatId] = null;
        return;
      }

      if (step[chatId] === 'awaiting_category_name') {
        const categoryName = messageText?.trim();
        if (!categoryName) return ctx.reply('Category name cannot be empty.');
        await Category.create({ name: categoryName });
        step[chatId] = null;
        await ctx.reply('✅ Category added.');
        return showAdminMenu(ctx);
      }

      if (step[chatId] === 'awaiting_note_content') {
        const message = ctx.message;
        if (message.text === '/done') {
          step[chatId] = 'awaiting_note_keywords';
          return ctx.reply('🔖 Add keywords for your note (e.g., keyword1, keyword2):');
        }

        if (message.text) {
          tempData[chatId].text += (tempData[chatId].text ? '\n' : '') + message.text;
          const foundLinks = message.text.match(linkRegex);
          if (foundLinks?.length) tempData[chatId].links.push(...foundLinks);
        } else if (message.document) {
          tempData[chatId].fileIds.push(message.document.file_id);
        } else if (message.photo) {
          tempData[chatId].photoIds.push(message.photo.at(-1).file_id);
        } else {
          return ctx.reply('Unsupported message type.');
        }

        return ctx.reply('✅ Part added. Continue or type /done to save.');
      }

      if (step[chatId] === 'awaiting_note_keywords') {
        const rawKeywords = messageText?.trim();
        const keywords = rawKeywords?.split(',').map(k => k.trim()).filter(Boolean);
        if (!keywords?.length) return ctx.reply('❗ Please enter at least one valid keyword.');

        const { categoryId, text, links, fileIds, photoIds } = tempData[chatId];
        await Note.create({ category: categoryId, text, links, fileIds, photoIds, keywords });
        step[chatId] = null;
        tempData[chatId] = {};
        await ctx.reply('✅ Note saved.');
        return showAdminMenu(ctx);
      }
    }
  } catch (err) {
    console.error('Error in handleAdminActions:', err);
    return ctx.reply('An error occurred. Please try again.');
  }
}

module.exports = { showAdminMenu, handleAdminActions };
