const { SlashCommandBuilder } = require('discord.js');
const { needActive, reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the currently playing track'),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;
    if (!state.current) return reply(interaction, '❌ Nothing is playing.');
    return reply(interaction, state.player.pause() ? '⏸️ Paused.' : '❌ Already paused.');
  },
};
