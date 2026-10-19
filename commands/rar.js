const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { checkTarget, botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rar')
    .setDescription('Remove all roles from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((o) => o.setName('member').setDescription('Member to strip of roles').setRequired(true)),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageRoles);
    if (missing) return fail(interaction, missing);

    const member = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);
    const err = checkTarget(interaction, member, { allowSelf: true });
    if (err) return fail(interaction, err);

    const removable = member.roles.cache.filter((r) => r.id !== interaction.guildId && !r.managed && r.editable);
    if (!removable.size) return fail(interaction, '❌ There are no removable roles on that member.');

    await member.roles.remove([...removable.keys()], `All roles removed by ${interaction.user.tag}`);
    return reply(interaction, `🧽 Removed **${removable.size}** role(s) from ${member}.`);
  },
};
