require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

// Models
const Category = require('./models/Category');
const Note = require('./models/Note');

// Handlers
const { showAdminMenu, handleAdminActions } = require('./handlers/admin');
const { showUserMenu, handleUserActions } = require('./handlers/user');

// Init bot
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_IDS = process.env.ADMIN_IDS.split(',');


// MongoDB Connect
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware - Identify Admin
bot.use((ctx, next) => {
  ctx.isAdmin = ADMIN_IDS.includes(ctx.from?.id?.toString());
  return next();
});

// /start command
bot.start(async (ctx) => {
  try {
    if (ctx.isAdmin) {
      await ctx.reply('👋 Welcome Admin. Choose an option:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚙ Admin Menu', callback_data: 'admin_menu' }],
            [{ text: '📁 User View (Categories)', callback_data: 'user_menu' }],
          ],
        },
      });
    } else {
      await showUserMenu(ctx);
    }
  } catch (err) {
    console.error('Error in /start handler:', err);
    await ctx.reply('⚠️ An error occurred. Please try again later.');
  }
});

// Callback handler
bot.on('callback_query', async (ctx) => {
  try {
    const data = ctx.callbackQuery?.data;

    if (ctx.isAdmin) {
      switch (data) {
        case 'admin_menu':
          return await showAdminMenu(ctx);
        case 'user_menu':
          return await showUserMenu(ctx);
        default:
          return await handleAdminActions(ctx);
      }
    } else {
      if (data.startsWith('user_cat_')) {
        return await handleUserActions(ctx);
      } else {
        return await ctx.answerCbQuery('❌ Unauthorized action.', { show_alert: true });
      }
    }
  } catch (err) {
    console.error('Error in callback_query handler:', err);
  }
});

// Text or media message handler
bot.on('message', async (ctx) => {
  try {
    if (ctx.isAdmin) {
      await handleAdminActions(ctx);
    }
  } catch (err) {
    console.error('Error in message handler:', err);
  }
});

// Launch the bot
(async () => {
  try {
    await bot.telegram.deleteWebhook();
    await bot.launch();
    console.log('🚀 Bot started with polling');
  } catch (err) {
    console.error('❌ Error starting bot:', err);
  }
})();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
