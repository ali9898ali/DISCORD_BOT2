const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing, guildData, releasePrison } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unprison')
    .setDescription('Unprison a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((o) => o.setName('member').setDescription('Member to release').setRequired(true)),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageRoles);
    if (missing) return fail(interaction, missing);

    const user = interaction.options.getUser('member');
    if (!guildData(interaction.guildId).prisons[user.id]) return fail(interaction, "❌ That member isn't imprisoned.");

    await interaction.deferReply();
    await releasePrison(interaction.guild, user.id);
    return reply(interaction, `🔓 Released ${user} from prison and restored their roles.`);
  },
};
