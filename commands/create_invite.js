const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create_invite')
    .setDescription('Create an invite link for the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.CreateInstantInvite)
    .addChannelOption((o) => o.setName('channel').setDescription('Channel to invite to (default: this one)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice))
    .addIntegerOption((o) => o.setName('max_age_hours').setDescription('Expires after this many hours (0 = never, default 24)').setMinValue(0).setMaxValue(168))
    .addIntegerOption((o) => o.setName('max_uses').setDescription('Maximum number of uses (0 = unlimited)').setMinValue(0).setMaxValue(100))
    .addBooleanOption((o) => o.setName('temporary').setDescription('Members are kicked when they go offline without a role')),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.CreateInstantInvite);
    if (missing) return fail(interaction, missing);

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const hours = interaction.options.getInteger('max_age_hours') ?? 24;
    const invite = await channel.createInvite({
      maxAge: hours * 3600,
      maxUses: interaction.options.getInteger('max_uses') ?? 0,
      temporary: interaction.options.getBoolean('temporary') ?? false,
      unique: true,
      reason: `Created by ${interaction.user.tag}`,
    });
    return reply(interaction, `🔗 ${invite.url}\n*${hours ? `Expires in ${hours}h` : 'Never expires'} • ${invite.maxUses ? `${invite.maxUses} use(s)` : 'Unlimited uses'}*`);
  },
};
