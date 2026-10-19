const { SlashCommandBuilder } = require('discord.js');
const { needActive, advance, reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skipto')
    .setDescription('Skip to a specific track in the queue')
    .addIntegerOption((o) => o.setName('position').setDescription('Position in the queue').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;

    const position = interaction.options.getInteger('position');
    if (position > state.queue.length) {
      return reply(interaction, `❌ The queue only has ${state.queue.length} track(s).`);
    }

    await interaction.deferReply();
    const skipped = state.queue.splice(0, position - 1);
    if (state.repeat === 'queue') state.queue.push(...skipped);
    await advance(state, true);
    return reply(interaction, `⏭️ Skipped to track **#${position}**.`);
  },
};
