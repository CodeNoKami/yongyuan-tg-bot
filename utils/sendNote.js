
module.exports = async function sendNote(ctx, note) {
  try {
    if (note.photoId) {
      await ctx.replyWithPhoto(note.photoId, {
        caption: note.text || undefined,
      });
    } else if (note.fileId) {
      await ctx.replyWithDocument(note.fileId, {
        caption: note.text || undefined,
      });
    } else if (note.link) {
      await ctx.reply(`${note.text || ''}\n🔗 ${note.link}`);
    } else if (note.text) {
      await ctx.reply(note.text);
    } else {
      await ctx.reply('⚠️ This note has no content.');
    }
  } catch (err) {
    console.error('Error sending note:', err);
    await ctx.reply('❌ Failed to send note.');
  }
};
