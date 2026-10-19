const { EmbedBuilder, MessageFlags } = require('discord.js');

const COLOR = 0x5865f2;
const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

/** Reply or edit depending on interaction state. Pass a string or a full payload. */
function reply(interaction, content) {
  const payload = typeof content === 'string' ? { content } : content;
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}

/** Error reply visible only to the user. */
function fail(interaction, message) {
  if (interaction.deferred || interaction.replied) return interaction.editReply({ content: message });
  return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
}

const embed = (title, description) => {
  const e = new EmbedBuilder().setColor(COLOR);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
};

module.exports = { COLOR, trunc, reply, fail, embed };
