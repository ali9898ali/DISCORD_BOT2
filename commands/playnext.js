const { SlashCommandBuilder } = require('discord.js');
const { getOrJoin, resolveTrack, advance, reply, trackEmbed, trunc } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playnext')
    .setDescription('Queue a track to play next from YouTube')
    .addStringOption((o) => o.setName('query').setDescription('Track name or YouTube URL').setRequired(true)),

  async execute(interaction) {
    const state = await getOrJoin(interaction);
    if (!state) return;

    await interaction.deferReply();
    const track = await resolveTrack(interaction.options.getString('query'), interaction.user.id);
    if (!track) return reply(interaction, '❌ No results found.');

    state.queue.unshift(track);
    if (!state.current) {
      await advance(state, true);
      return reply(interaction, `▶️ Playing **${trunc(track.title, 100)}**`);
    }
    return reply(interaction, { embeds: [trackEmbed('⏭️ Playing next', track)] });
  },
};
