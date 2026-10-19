const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the text chat')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((o) => o.setName('channel').setDescription('Chat to unlock (default: this one)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageChannels);
    if (missing) return fail(interaction, missing);

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null, SendMessagesInThreads: null,
    }, { reason: `Unlocked by ${interaction.user.tag}` });
    return reply(interaction, `🔓 Unlocked ${channel}.`);
  },
};
