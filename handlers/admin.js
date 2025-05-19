const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');
const sendNote = require('../utils/sendNote');
const searchNotesByKeyword = require('../utils/searchNotes');

const step = {};
const tempData = {};

// Link extraction regex
const linkRegex = /(https?:\/\/[^\s]+)/g;

async function showAdminMenu(ctx) {
  try {
    const categories = await Category.find().lean();
    const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat._id}`)]);
    buttons.push([Markup.button.callback('➕ ခေါင်းစဥ်အသစ်ထည့်မည်', 'add_category')]);
    buttons.push([Markup.button.callback('📝 မှတ်တမ်းအသစ်ထည့်မည်', 'add_note')]);
    buttons.push([Markup.button.callback('❌ ခေါင်းစဥ်ဖျက်မည်', 'delete_category')]);
    buttons.push([Markup.button.callback('🗑 မှတ်တမ်းဖျက်မည် ', 'delete_note')]);
    buttons.push([Markup.button.callback('🔍 မှတ်တမ်းများကို ရှာဖွေမည်', 'search_note')]);
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
        await ctx.answerCbQuery();
        return showAdminMenu(ctx);

      } else if (data === 'add_category') {
        step[chatId] = 'awaiting_category_name';
        return ctx.reply('🆕 Send the category name:');

      } else if (data === 'add_note') {
        const categories = await Category.find().lean();
        if (categories.length === 0) {
          await ctx.reply('No categories found. Add a category first.');
          return showAdminMenu(ctx);
        }
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `note_cat_${cat._id}`)]);
        step[chatId] = 'awaiting_note_category';
        return ctx.reply('Choose a category for the new note:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('note_cat_')) {
        tempData[chatId] = { categoryId: data.replace('note_cat_', ''), text: '', links: [], fileIds: [], photoIds: [], keywords: [] };
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
        await ctx.reply('✅ Category and its notes deleted.');
        return showAdminMenu(ctx);

      } else if (data === 'delete_note') {
        const categories = await Category.find().lean();
        if (categories.length === 0) {
          await ctx.reply('No categories found.');
          return showAdminMenu(ctx);
        }
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `del_note_cat_${cat._id}`)]);
        step[chatId] = 'awaiting_delete_note_category';
        return ctx.reply('Select category to delete notes from:', Markup.inlineKeyboard(buttons));

      } else if (data.startsWith('del_note_cat_')) {
        const categoryId = data.replace('del_note_cat_', '');
        const notes = await Note.find({ category: categoryId }).lean();
        if (notes.length === 0) {
          step[chatId] = null;
          await ctx.reply('No notes found in this category.');
          return showAdminMenu(ctx);
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
        await ctx.reply('✅ Note deleted.');
        return showAdminMenu(ctx);

      } else if (data === 'search_note') {
        step[chatId] = 'awaiting_search_keyword';
        return ctx.reply('🔍 Send a keyword to search notes:');
      }

      return ctx.answerCbQuery();
    }

    if (ctx.message) {
      const messageText = ctx.message.text;

      if ((messageText?.startsWith('/search') || step[chatId] === 'awaiting_search_keyword') && step[chatId] !== 'awaiting_note_keywords') {
        const keyword = messageText.split(' ')[1] || messageText;
        if (!keyword) return ctx.reply('❗️Please provide a keyword.');
        const results = await searchNotesByKeyword(keyword);
        if (results.length === 0) return ctx.reply('🔍 No notes found for this keyword.');
        for (const note of results) await sendNote(ctx, note);
        step[chatId] = null;
        return;
      }

      if (step[chatId] === 'awaiting_category_name') {
        const categoryName = messageText?.trim();
        if (!categoryName) return ctx.reply('Category name cannot be empty. Please send a valid name.');
        await Category.create({ name: categoryName });
        step[chatId] = null;
        await ctx.reply('✅ Category added.');
        return showAdminMenu(ctx);

      } else if (step[chatId] === 'awaiting_note_content') {
        const { categoryId } = tempData[chatId] || {};
        if (!categoryId) {
          step[chatId] = null;
          return ctx.reply('Category not selected. Please start over.');
        }
        const message = ctx.message;
        if (message.text) {
          if (message.text === '/done') {
            step[chatId] = 'awaiting_note_keywords';
            return ctx.reply('🔖 Add keywords for your note (e.g., keyword1,keyword2):');
          }
          tempData[chatId].text += (tempData[chatId].text ? '\n' : '') + message.text;
          const foundLinks = message.text.match(linkRegex);
          if (foundLinks?.length > 0) tempData[chatId].links.push(...foundLinks);
        } else if (message.document) {
          tempData[chatId].fileIds.push(message.document.file_id);
        } else if (message.photo) {
          tempData[chatId].photoIds.push(message.photo.at(-1).file_id);
        } else {
          return ctx.reply('Unsupported message type.');
        }
        return ctx.reply('✅ Part added. Continue or type /done to save.');

      } else if (step[chatId] === 'awaiting_note_keywords') {
        const rawKeywords = messageText?.trim();
        if (!rawKeywords) return ctx.reply('❗ Please enter at least one keyword.');

        // Convert comma separated string into array for DB storage
        const keywords = rawKeywords.split(',').map(k => k.trim()).filter(Boolean);
        if (keywords.length === 0) return ctx.reply('❗ Please enter valid keywords.');

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

module.exports = {
  showAdminMenu,
  handleAdminActions
};
