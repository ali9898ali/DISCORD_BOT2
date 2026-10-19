const { SlashCommandBuilder } = require('discord.js');
const { needActive, reply } = require('../utils/music');

const NEXT_MODE = { off: 'track', track: 'queue', queue: 'off' };
const ICONS = { off: '➡️', track: '🔂', queue: '🔁' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repeat')
    .setDescription('Toggle repeat mode for the current track or queue')
    .addStringOption((o) => o.setName('mode').setDescription('Repeat mode (leave empty to cycle)').addChoices(
      { name: 'Off', value: 'off' },
      { name: 'Track', value: 'track' },
      { name: 'Queue', value: 'queue' },
    )),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;

    state.repeat = interaction.options.getString('mode') ?? NEXT_MODE[state.repeat];
    return reply(interaction, `${ICONS[state.repeat]} Repeat mode: **${state.repeat}**`);
  },
};
