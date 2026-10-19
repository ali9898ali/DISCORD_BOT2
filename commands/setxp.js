const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const L = require('../utils/levels');
const { reply } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription("Set member's points")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('member').setDescription('Member to change').setRequired(true))
    .addIntegerOption((o) => o.setName('points').setDescription('New points amount').setMinValue(0).setMaxValue(100_000_000).setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('member');
    const xp = interaction.options.getInteger('points');
    L.user(interaction.guildId, user.id).xp = xp;
    L.save();
    return reply(interaction, `✅ Set ${user}'s points to **${xp.toLocaleString()}** (level **${L.levelFromXp(xp)}**).`);
  },
};
