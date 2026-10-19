const { SlashCommandBuilder } = require('discord.js');
const { needActive, reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Show or set the playback volume (1–100)')
    .addIntegerOption((o) => o.setName('level').setDescription('Volume from 1 to 100').setMinValue(1).setMaxValue(100)),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;

    const level = interaction.options.getInteger('level');
    if (level === null) return reply(interaction, `🔊 Current volume: **${state.volume}%**`);

    state.volume = level;
    state.resource?.volume?.setVolume(level / 100);
    return reply(interaction, `🔊 Volume set to **${level}%**`);
  },
};
