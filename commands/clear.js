const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear current chat messages or a specific chat')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) => o.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
    .addChannelOption((o) => o.setName('channel').setDescription('Chat to clear (default: this one)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice))
    .addUserOption((o) => o.setName('member').setDescription('Only delete messages from this member')),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageMessages);
    if (missing) return fail(interaction, missing);

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('member');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messages = await channel.messages.fetch({ limit: 100 });
    if (target) messages = messages.filter((m) => m.author.id === target.id);

    // bulkDelete skips messages older than 14 days
    const deleted = await channel.bulkDelete([...messages.values()].slice(0, amount), true);
    return reply(interaction, `🧹 Deleted **${deleted.size}** message(s) in ${channel}.${deleted.size < amount ? '\n*(Messages older than 14 days can\'t be bulk deleted.)*' : ''}`);
  },
};
