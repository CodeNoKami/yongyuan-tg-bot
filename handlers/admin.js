const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');

async function showAdminMenu(ctx) {
    const categories = await Category.find();
    const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat._id}`)]);
    buttons.push([Markup.button.callback('➕ Add Category', 'add_category')]);
    buttons.push([Markup.button.callback('📝 Add Note', 'add_note')]);
    return ctx.reply('📋 Admin Menu:', Markup.inlineKeyboard(buttons));
}

let step = {};
let tempData = {};

async function handleAdminActions(ctx) {
    const chatId = ctx.from.id;

    if (ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;

        if (data.startsWith('cat_')) {
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
            ctx.reply('🆕 Send the category name:');
        } else if (data === 'add_note') {
            step[chatId] = 'awaiting_note_category';
            const categories = await Category.find();
            const buttons = categories.map(cat => [Markup.button.callback(cat.name, `note_cat_${cat._id}`)]);
            ctx.reply('Choose a category for the new note:', Markup.inlineKeyboard(buttons));
        } else if (data.startsWith('note_cat_')) {
            tempData[chatId] = { categoryId: data.replace('note_cat_', '') };
            step[chatId] = 'awaiting_note_content';
            ctx.reply('Now send the note content (text, file, image, or link):');
        }

        return ctx.answerCbQuery();
    }

    if (ctx.message) {
        if (step[chatId] === 'awaiting_category_name') {
            await Category.create({ name: ctx.message.text });
            ctx.reply('✅ Category added.');
            step[chatId] = null;
        }

        else if (step[chatId] === 'awaiting_note_content') {
            const { categoryId } = tempData[chatId];
            const note = {
                category: categoryId,
                text: ctx.message.text || null,
                link: ctx.message.entities?.some(e => e.type === 'url') ? ctx.message.text : null,
                fileId: ctx.message.document?.file_id || null,
                photoId: ctx.message.photo?.[0]?.file_id || null
            };

            await Note.create(note);
            ctx.reply('✅ Note saved.');
            step[chatId] = null;
            tempData[chatId] = {};
        }
    }
}

module.exports = {
    showAdminMenu,
    handleAdminActions
};

