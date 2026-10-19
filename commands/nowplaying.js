const { SlashCommandBuilder } = require('discord.js');
const { states, reply, trackEmbed, elapsed, fmtTime } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription("See what's currently playing"),

  async execute(interaction) {
    const state = states.get(interaction.guildId);
    if (!state?.current) return reply(interaction, '❌ Nothing is playing right now.');

    const track = state.current;
    const pos = elapsed(state);
    let bar = '';
    if (track.duration) {
      const size = 20;
      const filled = Math.min(size - 1, Math.floor((pos / track.duration) * size));
      bar = '▬'.repeat(filled) + '🔘' + '▬'.repeat(size - 1 - filled) + '\n';
    }

    const embed = trackEmbed('🎵 Now playing', track).addFields(
      { name: 'Progress', value: `${bar}\`${fmtTime(pos)} / ${fmtTime(track.duration)}\`` },
      { name: 'Repeat', value: state.repeat, inline: true },
      { name: 'Volume', value: `${state.volume}%`, inline: true },
    );
    return reply(interaction, { embeds: [embed] });
  },
};
