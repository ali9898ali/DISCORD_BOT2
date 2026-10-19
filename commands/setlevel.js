const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const L = require('../utils/levels');
const { reply } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription("Set member's level")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('member').setDescription('Member to change').setRequired(true))
    .addIntegerOption((o) => o.setName('level').setDescription('New level').setMinValue(0).setMaxValue(1000).setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('member');
    const level = interaction.options.getInteger('level');
    L.user(interaction.guildId, user.id).xp = L.xpForLevel(level);
    L.save();
    return reply(interaction, `✅ Set ${user}'s level to **${level}**.`);
  },
};
