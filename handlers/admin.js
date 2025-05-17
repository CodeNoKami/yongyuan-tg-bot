const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');

async function showAdminMenu(ctx) {
    const categories = await Category.find();
    const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat._id}`)]);
    buttons.push([Markup.button.callback('➕ Add Category', 'add_category')]);
    buttons.push([Markup.button.callback('📝 Add Note', 'add_note')]);
    buttons.push([Markup.button.callback('❌ Delete Category', 'delete_category')]);
    buttons.push([Markup.button.callback('🗑 Delete Note', 'delete_note')]);

    return ctx.reply('📋 Admin Menu:', Markup.inlineKeyboard(buttons));
}

let step = {};
let tempData = {};

async function handleAdminActions(ctx) {
    const chatId = ctx.from.id;

    if (ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;

        if (data.startsWith('cat_')) {
            // Show notes in category
            const categoryId = data.replace('cat_', '');
            const notes = await Note.find({ category: categoryId });

            if (notes.length === 0) {
                return ctx.reply('No notes found in this category.');
            }

            for (let note of notes) {
                if (note.text) await ctx.reply(note.text);
                if (note.link) await ctx.reply(note.link);
                if (note.fileId) await ctx.replyWithDocument(note.fileId);
                if (note.photoId) await ctx.replyWithPhoto(note.photoId);
            }

        } else if (data === 'add_category') {
            step[chatId] = 'awaiting_category_name';
            return ctx.reply('🆕 Send the category name:');

        } else if (data === 'add_note') {
            step[chatId] = 'awaiting_note_category';
            const categories = await Category.find();
            const buttons = categories.map(cat => [Markup.button.callback(cat.name, `note_cat_${cat._id}`)]);
            return ctx.reply('Choose a category for the new note:', Markup.inlineKeyboard(buttons));

        } else if (data.startsWith('note_cat_')) {
            tempData[chatId] = { categoryId: data.replace('note_cat_', '') };
            step[chatId] = 'awaiting_note_content';
            return ctx.reply('Now send the note content (text, file, image, or link):');

        } else if (data === 'delete_category') {
            step[chatId] = 'awaiting_delete_category';
            const categories = await Category.find();
            const buttons = categories.map(cat => [Markup.button.callback(cat.name, `del_cat_${cat._id}`)]);
            return ctx.reply('Select category to delete:', Markup.inlineKeyboard(buttons));

        } else if (data.startsWith('del_cat_')) {
            const categoryId = data.replace('del_cat_', '');
            // Delete category & all notes in that category
            await Note.deleteMany({ category: categoryId });
            await Category.findByIdAndDelete(categoryId);
            step[chatId] = null;
            return ctx.reply('✅ Category and its notes deleted.');

        } else if (data === 'delete_note') {
            step[chatId] = 'awaiting_delete_note_category';
            const categories = await Category.find();
            const buttons = categories.map(cat => [Markup.button.callback(cat.name, `del_note_cat_${cat._id}`)]);
            return ctx.reply('Select category to delete notes from:', Markup.inlineKeyboard(buttons));

        } else if (data.startsWith('del_note_cat_')) {
            const categoryId = data.replace('del_note_cat_', '');
            const notes = await Note.find({ category: categoryId });
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
            await Category.create({ name: ctx.message.text });
            step[chatId] = null;
            return ctx.reply('✅ Category added.');

        } else if (step[chatId] === 'awaiting_note_content') {
            const { categoryId } = tempData[chatId];
            const note = {
                category: categoryId,
                text: ctx.message.text || null,
                link: ctx.message.entities?.some(e => e.type === 'url') ? ctx.message.text : null,
                fileId: ctx.message.document?.file_id || null,
                photoId: ctx.message.photo?.[0]?.file_id || null
            };

            await Note.create(note);
            step[chatId] = null;
            tempData[chatId] = {};
            return ctx.reply('✅ Note saved.');
        }
    }
}

module.exports = {
    showAdminMenu,
    handleAdminActions
};
