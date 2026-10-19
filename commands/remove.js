const { SlashCommandBuilder } = require('discord.js');
const { needActive, reply, trunc } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a track from the queue')
    .addIntegerOption((o) => o.setName('position').setDescription('Position in the queue').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;

    const position = interaction.options.getInteger('position');
    if (position > state.queue.length) {
      return reply(interaction, `❌ The queue only has ${state.queue.length} track(s).`);
    }
    const [removed] = state.queue.splice(position - 1, 1);
    return reply(interaction, `🗑️ Removed **${trunc(removed.title, 100)}** from the queue.`);
  },
};
