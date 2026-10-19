const { SlashCommandBuilder } = require('discord.js');
const { needActive, advance, reply, trunc } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;
    if (!state.current) return reply(interaction, '❌ Nothing is playing.');

    const title = state.current.title;
    await interaction.deferReply();
    await advance(state, true);
    return reply(interaction, `⏭️ Skipped **${trunc(title, 100)}**`);
  },
};
