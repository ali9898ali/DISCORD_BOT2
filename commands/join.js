const { SlashCommandBuilder } = require('discord.js');
const { getOrJoin, reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join a voice channel to start playing tracks'),

  async execute(interaction) {
    const state = await getOrJoin(interaction);
    if (!state) return;
    return reply(interaction, `✅ Joined <#${state.connection.joinConfig.channelId}>. Use \`/play\` to start the music.`);
  },
};
