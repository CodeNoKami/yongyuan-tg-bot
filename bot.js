require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Note = require('./models/Note');
const { showAdminMenu } = require('./handlers/admin');
const { handleUserCommands } = require('./handlers/user');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('MongoDB connected');
});

// Define bot commands
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

// 🚫 Fix 409 Conflict error by removing old webhook
(async () => {
    try {
        await bot.telegram.deleteWebhook();
        await bot.launch();
        console.log('🤖 Bot is up and running...');
    } catch (err) {
        console.error('❌ Failed to launch bot:', err);
    }
})();
