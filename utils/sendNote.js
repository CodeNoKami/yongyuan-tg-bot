const escapeMarkdownV2 = (text) => {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
};

module.exports = async function sendNote(ctx, note) {
  try {
    const { text, link, photoId, fileId } = note;

    // Send all photos
    if (Array.isArray(photoId) && photoId.length > 0) {
      for (const pid of photoId) {
        await ctx.replyWithPhoto(pid);
      }
    }

    // Send all files
    if (Array.isArray(fileId) && fileId.length > 0) {
      for (const fid of fileId) {
        await ctx.replyWithDocument(fid);
      }
    }

    // Send all links
    if (Array.isArray(link) && link.length > 0) {
      for (const lnk of link) {
        await ctx.reply(`🔗 ${escapeMarkdownV2(lnk)}`, { parse_mode: 'MarkdownV2' });
      }
    }

    // Send all texts
    if (Array.isArray(text) && text.length > 0) {
      for (const t of text) {
        await ctx.reply(escapeMarkdownV2(t), { parse_mode: 'MarkdownV2' });
      }
    }

    // Fallback: if no content exists
    if (
      (!Array.isArray(photoId) || photoId.length === 0) &&
      (!Array.isArray(fileId) || fileId.length === 0) &&
      (!Array.isArray(link) || link.length === 0) &&
      (!Array.isArray(text) || text.length === 0)
    ) {
      await ctx.reply('⚠️ This note has no content.');
    }
  } catch (err) {
    console.error('Error sending note:', err);
    await ctx.reply('❌ Failed to send note.');
  }
};
