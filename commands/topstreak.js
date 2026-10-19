const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply, COLOR } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('topstreak')
    .setDescription('View a list of top members with daily streaks in the server'),

  async execute(interaction) {
    const board = Object.entries(L.store.data[interaction.guildId] || {})
      .map(([id, u]) => [id, L.activeStreak(u)])
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    if (!board.length) return reply(interaction, '📭 Nobody has an active streak. Claim one with `/daily`!');

    const medals = ['🥇', '🥈', '🥉'];
    const embed = new EmbedBuilder().setColor(COLOR).setTitle('🔥 Top daily streaks')
      .setDescription(board.map(([id, s], i) => `${medals[i] || `**${i + 1}.**`} <@${id}> — **${s}** day(s)`).join('\n'));
    return reply(interaction, { embeds: [embed] });
  },
};
