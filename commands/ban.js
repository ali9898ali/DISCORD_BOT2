const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { parseDuration, formatDuration } = require('../utils/time');
const { checkTarget, botMissing, guildData, save } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from accessing the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the ban'))
    .addStringOption((o) => o.setName('duration').setDescription('Temporary ban length, e.g. 7d or 12h (empty = permanent)'))
    .addIntegerOption((o) => o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.BanMembers);
    if (missing) return fail(interaction, missing);

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const durationInput = interaction.options.getString('duration');
    const days = interaction.options.getInteger('delete_days') ?? 0;

    let ms = null;
    if (durationInput) {
      ms = parseDuration(durationInput);
      if (!ms) return fail(interaction, '❌ Invalid duration. Use something like `30m`, `12h`, `7d`.');
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const err = checkTarget(interaction, member);
      if (err) return fail(interaction, err);
      if (!member.bannable) return fail(interaction, "❌ I can't ban that member.");
    } else if (user.id === interaction.user.id) {
      return fail(interaction, "❌ You can't ban yourself.");
    }

    await interaction.deferReply();
    await user.send(`🔨 You were banned from **${interaction.guild.name}**${ms ? ` for ${formatDuration(ms)}` : ''}.\nReason: ${reason}`).catch(() => {});
    await interaction.guild.members.ban(user, { reason: `${interaction.user.tag}: ${reason}`, deleteMessageSeconds: days * 86400 });

    if (ms) {
      guildData(interaction.guildId).tempBans[user.id] = { until: Date.now() + ms, reason, by: interaction.user.id };
      save();
    }
    return reply(interaction, `🔨 Banned **${user.tag}**${ms ? ` for **${formatDuration(ms)}**` : ''}. Reason: ${reason}`);
  },
};
