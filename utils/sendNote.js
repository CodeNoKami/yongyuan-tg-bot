function escapeMarkdownV2(text) {
  if (!text) return '';
  return text.replace(/[-_[\]()~`>#+=|{}.!\\]/g, '\\$&');
}

module.exports = async function sendNote(ctx, note) {
  try {
    let hasContent = false;

    // Photos (correct field: photoIds)
    if (Array.isArray(note.photoIds)) {
      for (const pid of note.photoIds.filter(Boolean)) {
        await ctx.replyWithPhoto(pid);
        hasContent = true;
      }
    }

    // Files (correct field: fileIds)
    if (Array.isArray(note.fileIds)) {
      for (const fid of note.fileIds.filter(Boolean)) {
        await ctx.replyWithDocument(fid);
        hasContent = true;
      }
    }

    // Links
    if (Array.isArray(note.links)) {
      for (const lnk of note.links.filter(Boolean)) {
        await ctx.reply(`🔗 ${escapeMarkdownV2(lnk)}`, { parse_mode: 'MarkdownV2' });
        hasContent = true;
      }
    }

    // Text (single string)
    if (note.text && typeof note.text === 'string') {
      await ctx.reply(escapeMarkdownV2(note.text), { parse_mode: 'MarkdownV2' });
      hasContent = true;
    }

    // No content
    if (!hasContent) {
      await ctx.reply('⚠️ This note has no content.');
    }

    return hasContent;
  } catch (err) {
    console.error('Error in sendNote:', err);
    await ctx.reply('❌ Failed to send note.');
    return false;
  }
};
