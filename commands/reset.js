const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const L = require('../utils/levels');
const { reply, fail } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription("Reset a member's or a server's points")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('member').setDescription('Member to reset'))
    .addBooleanOption((o) => o.setName('server').setDescription('Reset the points of every member in the server')),

  async execute(interaction) {
    const user = interaction.options.getUser('member');
    const server = interaction.options.getBoolean('server');
    if (Boolean(user) === Boolean(server)) return fail(interaction, '❌ Choose either a `member` or `server: true`.');

    if (user) {
      L.user(interaction.guildId, user.id).xp = 0;
      L.save();
      return reply(interaction, `♻️ Reset ${user}'s points.`);
    }
    const g = L.store.data[interaction.guildId] || {};
    let count = 0;
    for (const u of Object.values(g)) if (u.xp) { u.xp = 0; count++; }
    L.save();
    return reply(interaction, `♻️ Reset the points of **${count}** member(s) in this server.`);
  },
};
