const { SlashCommandBuilder } = require('discord.js');
const { needActive, destroyState, reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel'),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;
    destroyState(state);
    return reply(interaction, '👋 Left the voice channel.');
  },
};
