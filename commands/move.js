const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move a member to another voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member to move').setRequired(true))
    .addChannelOption((o) => o.setName('channel').setDescription('Destination voice channel')
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice).setRequired(true)),

  async execute(interaction) {
    const target = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);
    const channel = interaction.options.getChannel('channel');

    if (!target?.voice.channel) return reply(interaction, "❌ That member isn't in a voice channel.");
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
      return reply(interaction, '❌ I need the **Move Members** permission.');
    }
    await target.voice.setChannel(channel.id, `Moved by ${interaction.user.tag}`);
    return reply(interaction, `✅ Moved ${target} to ${channel}.`);
  },
};
