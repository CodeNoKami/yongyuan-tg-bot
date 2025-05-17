require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

const Category = require('./models/Category');
const Note = require('./models/Note');

const { showAdminMenu, handleAdminActions } = require('./handlers/admin');
const { handleUserCommands, handleUserCategory } = require('./handlers/user');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware to mark admin users
bot.use((ctx, next) => {
  ctx.isAdmin = ctx.from && ctx.from.id.toString() === ADMIN_ID;
  return next();
});

// /start command handler
bot.start(async (ctx) => {
  try {
    if (ctx.isAdmin) {
      await ctx.reply('👋 Welcome Admin. Choose an option:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚙ Admin Menu', callback_data: 'admin_menu' }],
            [{ text: '📁 User View (Categories)', callback_data: 'user_menu' }]
          ]
        }
      });
    } else {
      await handleUserCommands(ctx);
    }
  } catch (err) {
    console.error('Error in /start handler:', err);
    await ctx.reply('An error occurred. Please try again later.');
  }
});

// Handle callback queries
bot.on('callback_query', async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;

    if (ctx.isAdmin) {
      if (data === 'admin_menu') {
        await showAdminMenu(ctx);
      } else if (data === 'user_menu') {
        await handleUserCommands(ctx);
      } else {
        await handleAdminActions(ctx);
      }
    } else {
      if (data.startsWith('user_cat_')) {
        await handleUserCategory(ctx);
      } else {
        await ctx.answerCbQuery('Unauthorized action.', { show_alert: true });
      }
    }
  } catch (err) {
    console.error('Error in callback_query handler:', err);
  }
});

// Handle text messages (mostly for admin input)
bot.on('message', async (ctx) => {
  try {
    if (ctx.isAdmin) {
      await handleAdminActions(ctx);
    }
    // You can add user text message handling here if needed
  } catch (err) {
    console.error('Error in message handler:', err);
  }
});

// Start the bot
bot.launch()
  .then(() => console.log('🚀 Bot started'))
  .catch(console.error);

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
