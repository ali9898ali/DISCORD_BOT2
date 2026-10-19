const { SlashCommandBuilder } = require('discord.js');
const { needActive, scheduleIdleLeave, reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

  async execute(interaction) {
    const state = await needActive(interaction);
    if (!state) return;

    state.queue = [];
    state.current = null;
    state.resource = null;
    try { state.ffmpeg?.kill('SIGKILL'); } catch {}
    state.player.stop(true);
    scheduleIdleLeave(state);
    return reply(interaction, '⏹️ Stopped playback and cleared the queue.');
  },
};
