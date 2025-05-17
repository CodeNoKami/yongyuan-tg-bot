const Category = require('../models/Category');
const Note = require('../models/Note');
const { Markup } = require('telegraf');

async function handleUserCommands(ctx) {
    const categories = await Category.find({});
    const buttons = categories.map(cat => [cat.name]);
    return ctx.reply('📁 Choose a category:', Markup.keyboard(buttons).resize());
}

module.exports = { handleUserCommands };
