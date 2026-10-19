const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { needActive, playTrack, parseTime, fmtTime, reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Jump to a specific time in the current track')
    .addStringOption((o) => o.setName('time').setDescription('Time like 90, 1:30 or 1:02:03').setRequired(true)),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;
    if (!state.current) return reply(interaction, '❌ Nothing is playing.');

    const seconds = parseTime(interaction.options.getString('time'));
    if (seconds === null) return reply(interaction, '❌ Invalid time. Use `90`, `1:30` or `1:02:03`.');

    const duration = state.current.duration;
    if (duration && seconds >= duration) {
      return reply(interaction, `❌ That's past the end of the track (${fmtTime(duration)}).`);
    }

    await interaction.deferReply();
    const wasPaused = state.player.state.status === AudioPlayerStatus.Paused;
    await playTrack(state, state.current, seconds);
    if (wasPaused) state.player.pause();
    return reply(interaction, `⏩ Jumped to **${fmtTime(seconds)}**`);
  },
};
