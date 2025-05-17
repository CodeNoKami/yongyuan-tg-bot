const { Markup } = require('telegraf');
const Category = require('../models/Category');
const Note = require('../models/Note');

async function showAdminMenu(ctx) {
    return ctx.reply('🔐 Admin Menu', Markup.keyboard([
        ['➕ Add Category', '🗑 Delete Category'],
        ['📝 Add Note', '❌ Delete Note'],
        ['📋 View Categories']
    ]).resize());
}

module.exports = { showAdminMenu };
