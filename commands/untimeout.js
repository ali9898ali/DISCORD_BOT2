const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a timeout from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member to remove the timeout from').setRequired(true)),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ModerateMembers);
    if (missing) return fail(interaction, missing);

    const member = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);
    if (!member) return fail(interaction, '❌ That member is not in this server.');
    if (!member.isCommunicationDisabled()) return fail(interaction, "❌ That member isn't timed out.");

    await member.timeout(null, `Timeout removed by ${interaction.user.tag}`);
    return reply(interaction, `✅ Removed the timeout from ${member}.`);
  },
};
