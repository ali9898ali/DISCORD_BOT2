const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveme')
    .setDescription('Move yourself to another voice channel')
    .addChannelOption((o) => o.setName('channel').setDescription('Destination voice channel')
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice).setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!interaction.member.voice.channel) return reply(interaction, '❌ You need to be in a voice channel first.');
    if (!channel.permissionsFor(interaction.member).has(PermissionFlagsBits.Connect)) {
      return reply(interaction, "❌ You don't have permission to join that channel.");
    }
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
      return reply(interaction, '❌ I need the **Move Members** permission.');
    }
    await interaction.member.voice.setChannel(channel.id, 'Self move');
    return reply(interaction, `✅ Moved you to ${channel}.`);
  },
};
