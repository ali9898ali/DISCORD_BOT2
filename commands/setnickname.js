const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { checkTarget, botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setnickname')
    .setDescription('Set or remove a nickname')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((o) => o.setName('member').setDescription('Member to rename').setRequired(true))
    .addStringOption((o) => o.setName('nickname').setDescription('New nickname (leave empty to remove it)').setMaxLength(32)),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageNicknames);
    if (missing) return fail(interaction, missing);

    const member = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);
    const err = checkTarget(interaction, member, { allowSelf: true });
    if (err) return fail(interaction, err);
    if (!member.manageable) return fail(interaction, "❌ I can't change that member's nickname.");

    const nickname = interaction.options.getString('nickname');
    await member.setNickname(nickname || null, `Changed by ${interaction.user.tag}`);
    return reply(interaction, nickname ? `✏️ Set ${member}'s nickname to **${nickname}**.` : `✏️ Removed ${member}'s nickname.`);
  },
};
