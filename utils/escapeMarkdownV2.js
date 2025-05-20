function escapeMarkdownV2(text) {
  if (!text) return '';
  // Escape all special MarkdownV2 characters including the hyphen placed first for safety
  return text.replace(/[-_*\[\]()~`>#+=|{}.!\\]/g, '\\$&');
}

module.exports = escapeMarkdownV2;
