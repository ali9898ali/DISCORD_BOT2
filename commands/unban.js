const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing, guildData, save } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('user').setDescription('User to unban (paste their ID)').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the unban')),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.BanMembers);
    if (missing) return fail(interaction, missing);

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const ban = await interaction.guild.bans.fetch(user.id).catch(() => null);
    if (!ban) return fail(interaction, "❌ That user isn't banned.");

    await interaction.guild.members.unban(user.id, `${interaction.user.tag}: ${reason}`);
    delete guildData(interaction.guildId).tempBans[user.id];
    save();
    return reply(interaction, `✅ Unbanned **${user.tag}**.`);
  },
};
