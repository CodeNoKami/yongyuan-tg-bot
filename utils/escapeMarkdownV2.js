function escapeMarkdownV2(text) {
	if(!text) return;
  return text.replace(/[\_\*\[\]\(\)~`>#+\-=|{}.!]/g, '\\$&');
}

module.exports = escapeMarkdownV2;
