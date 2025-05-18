require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

const Category = require('./models/Category');
const Note = require('./models/Note');

const { showAdminMenu, handleAdminActions } = require('./handlers/admin');
// renamed user handlers:
const { showUserMenu, handleUserActions } = require('./handlers/user');

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

// /start handler
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
      await showUserMenu(ctx); // renamed here
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
    console.log(`[Callback] User: ${ctx.from.id} | Data: ${data}`);

    if (ctx.isAdmin) {
      if (data === 'admin_menu') {
        await showAdminMenu(ctx);
      } else if (data === 'user_menu') {
        await showUserMenu(ctx); // renamed here
      } else {
        await handleAdminActions(ctx);
      }
    } else {
      if (data.startsWith('user_cat_')) {
        await handleUserActions(ctx);  // renamed here
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
  } catch (err) {
    console.error('Error in message handler:', err);
  }
});

// Start bot
bot.telegram.deleteWebhook()
  .then(() => {
    console.log('✅ Webhook deleted');
    return bot.launch();
  })
  .then(() => {
    console.log('🚀 Bot started with polling');
  })
  .catch((err) => {
    console.error('❌ Error starting bot:', err);
  });


// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
