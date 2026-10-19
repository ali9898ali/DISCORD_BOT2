const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply, COLOR } = require('../utils/common');
const { ts } = require('../utils/time');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streak')
    .setDescription("View your daily streaks or another member's")
    .addUserOption((o) => o.setName('member').setDescription('Member to look up (default: you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('member') || interaction.user;
    const u = L.user(interaction.guildId, user.id);
    const active = L.activeStreak(u);
    const next = u.lastDaily + 24 * 36e5;

    const embed = new EmbedBuilder().setColor(COLOR).setTitle(`🔥 ${user.displayName}'s daily streak`)
      .addFields(
        { name: 'Current streak', value: `**${active}** day(s)`, inline: true },
        { name: 'Best streak', value: `**${u.bestStreak}** day(s)`, inline: true },
        { name: 'Next daily', value: !u.lastDaily || next <= Date.now() ? 'Available now — use `/daily`' : ts(next), inline: true },
      );
    return reply(interaction, { embeds: [embed] });
  },
};
