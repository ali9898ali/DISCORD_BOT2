const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { parseDuration, formatDuration } = require('../utils/time');
const { checkTarget, botMissing } = require('../utils/mod');

const MAX = 28 * 864e5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Give a member a timeout')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member to time out').setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription('Length, e.g. 10m, 2h, 1d (max 28d)').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason')),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ModerateMembers);
    if (missing) return fail(interaction, missing);

    const member = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);
    const err = checkTarget(interaction, member);
    if (err) return fail(interaction, err);
    if (!member.moderatable) return fail(interaction, "❌ I can't time out that member.");

    const ms = parseDuration(interaction.options.getString('duration'));
    if (!ms || ms > MAX) return fail(interaction, '❌ Invalid duration. Use something like `10m`, `2h`, `1d` (max 28 days).');

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await member.timeout(ms, `${interaction.user.tag}: ${reason}`);
    return reply(interaction, `⏳ Timed out ${member} for **${formatDuration(ms)}**. Reason: ${reason}`);
  },
};
