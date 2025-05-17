require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Note = require('./models/Note');
const { showAdminMenu, handleAdminActions } = require('./handlers/admin');
const { handleUserCommands, handleUserCategory } = require('./handlers/user');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('MongoDB connected');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

bot.start(async (ctx) => {
    if (ctx.from.id.toString() === ADMIN_ID) {
        await ctx.reply('👋 Welcome Admin. Choose an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚙ Admin Menu', callback_data: 'admin_menu' }],
                    [{ text: '📁 User View (Categories)', callback_data: 'user_menu' }]
                ]
            }
        });
    } else {
        return handleUserCommands(ctx);
    }
});

// Handle admin/user menu switch on /start or buttons
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id.toString();

    if (userId === ADMIN_ID) {
        if (data === 'admin_menu') {
            return showAdminMenu(ctx);
        } else if (data === 'user_menu') {
            return handleUserCommands(ctx);
        } else {
            // Let admin actions handle other callbacks (e.g. category buttons, note buttons)
            return handleAdminActions(ctx);
        }
    } else {
        // For normal users: handle user category buttons
        if (data.startsWith('user_cat_')) {
            return handleUserCategory(ctx);
        } else {
            await ctx.answerCbQuery('Unauthorized action.');
        }
    }
});

// Handle text messages from admin for creating categories/notes
bot.on('message', async (ctx) => {
    if (ctx.from.id.toString() === ADMIN_ID) {
        await handleAdminActions(ctx);
    }
    // For users, if you want to support text commands or messages, handle here if needed
});

bot.launch()
    .then(() => console.log('🚀 Bot started'))
    .catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
