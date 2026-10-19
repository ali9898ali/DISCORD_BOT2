const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the text chat')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((o) => o.setName('channel').setDescription('Chat to lock (default: this one)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('reason').setDescription('Reason')),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageChannels);
    if (missing) return fail(interaction, missing);

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false, SendMessagesInThreads: false,
    }, { reason: `${interaction.user.tag}: ${reason}` });
    return reply(interaction, `🔒 Locked ${channel}. Reason: ${reason}`);
  },
};
