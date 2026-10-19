const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { checkTarget, botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the kick')),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.KickMembers);
    if (missing) return fail(interaction, missing);

    const member = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);
    const err = checkTarget(interaction, member);
    if (err) return fail(interaction, err);
    if (!member.kickable) return fail(interaction, "❌ I can't kick that member.");

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await interaction.deferReply();
    await member.send(`👢 You were kicked from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => {});
    await member.kick(`${interaction.user.tag}: ${reason}`);
    return reply(interaction, `👢 Kicked **${member.user.tag}**. Reason: ${reason}`);
  },
};
