const Category = require('../models/Category');
const Note = require('../models/Note');

async function handleUserCommands(ctx) {
    const categories = await Category.find();
    if (categories.length === 0) {
        return ctx.reply('❌ No categories found.');
    }

    let msg = '📂 Available Categories:\n';
    categories.forEach(cat => {
        msg += `- ${cat.name}\n`;
    });

    ctx.reply(msg);
}

module.exports = {
    handleUserCommands
};

