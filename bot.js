require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const { showAdminMenu, handleAdminActions } = require('./handlers/admin');
const { handleUserCommands } = require('./handlers/user');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

bot.start(async (ctx) => {
    if (ctx.from.id.toString() === ADMIN_ID) {
        return showAdminMenu(ctx);
    }
    return handleUserCommands(ctx);
});

bot.command('admin', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) {
        return ctx.reply('🚫 You are not authorized.');
    }
    return showAdminMenu(ctx);
});

bot.on('callback_query', handleAdminActions);
bot.on('message', handleAdminActions);

bot.launch().then(() => {
    console.log('🚀 Bot is up and running!');
}).catch((err) => {
    console.error('❌ Failed to launch bot:', err);
});
