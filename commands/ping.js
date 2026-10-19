const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Shows bot latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', withResponse: true });
    const message = sent.resource?.message;
    const roundtrip = message ? message.createdTimestamp - interaction.createdTimestamp : null;
    return interaction.editReply(`🏓 Pong!\n**Roundtrip:** ${roundtrip ?? '?'}ms\n**WebSocket:** ${Math.round(interaction.client.ws.ping)}ms`);
  },
};
