function escapeMarkdownV2(text) {
  if (!text) return '';
  return text.replace(/[-_[\]()~`>#+=|{}.!\\]/g, '\\$&');
}

module.exports = async function sendNote(ctx, note) {
  try {
    let hasContent = false;

    if (note.photoId) {
      if (Array.isArray(note.photoId)) {
        for (const pid of note.photoId) {
          await ctx.replyWithPhoto(pid);
          hasContent = true;
        }
      } else {
        await ctx.replyWithPhoto(note.photoId);
        hasContent = true;
      }
    }

    if (note.fileId) {
      if (Array.isArray(note.fileId)) {
        for (const fid of note.fileId) {
          await ctx.replyWithDocument(fid);
          hasContent = true;
        }
      } else {
        await ctx.replyWithDocument(note.fileId);
        hasContent = true;
      }
    }

    if (note.link) {
      if (Array.isArray(note.link)) {
        for (const lnk of note.link) {
          await ctx.reply(`🔗 ${escapeMarkdownV2(lnk)}`, { parse_mode: 'MarkdownV2' });
          hasContent = true;
        }
      } else {
        await ctx.reply(`🔗 ${escapeMarkdownV2(note.link)}`, { parse_mode: 'MarkdownV2' });
        hasContent = true;
      }
    }

    if (note.text) {
      if (Array.isArray(note.text)) {
        for (const t of note.text) {
          await ctx.reply(escapeMarkdownV2(t), { parse_mode: 'MarkdownV2' });
          hasContent = true;
        }
      } else {
        await ctx.reply(escapeMarkdownV2(note.text), { parse_mode: 'MarkdownV2' });
        hasContent = true;
      }
    }

    if (!hasContent) {
      await ctx.reply('⚠️ This note has no content.');
    }

    return hasContent; // return true if something was sent, else false
  } catch (err) {
    console.error('Error sending note:', err);
    await ctx.reply('❌ Failed to send note.');
    return false;
  }
};
