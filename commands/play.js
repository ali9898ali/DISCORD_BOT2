const { SlashCommandBuilder } = require('discord.js');
const { getOrJoin, resolveTrack, advance, reply, trunc } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a track instantly by name or YouTube URL')
    .addStringOption((o) => o.setName('query').setDescription('Track name or YouTube URL').setRequired(true)),

  async execute(interaction) {
    const state = await getOrJoin(interaction);
    if (!state) return;

    await interaction.deferReply();
    const track = await resolveTrack(interaction.options.getString('query'), interaction.user.id);
    if (!track) return reply(interaction, '❌ No results found.');

    state.queue.unshift(track);
    await advance(state, true);
    return reply(interaction, `▶️ Playing **${trunc(track.title, 100)}**`);
  },
};
