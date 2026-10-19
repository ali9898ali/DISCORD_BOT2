const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply, COLOR } = require('../utils/common');

const PER_PAGE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('View a list of top members with points in the server')
    .addIntegerOption((o) => o.setName('page').setDescription('Page number').setMinValue(1)),

  async execute(interaction) {
    const board = L.ranking(interaction.guildId, 'xp');
    if (!board.length) return reply(interaction, '📭 Nobody has points yet. Start chatting!');
    const pages = Math.ceil(board.length / PER_PAGE);
    const page = Math.min(interaction.options.getInteger('page') ?? 1, pages);
    const start = (page - 1) * PER_PAGE;
    const medals = ['🥇', '🥈', '🥉'];
    const rows = board.slice(start, start + PER_PAGE).map(([id, u], i) => {
      const rank = start + i;
      return `${medals[rank] || `**${rank + 1}.**`} <@${id}> — Level **${L.levelFromXp(u.xp)}** • ${u.xp.toLocaleString()} pts`;
    });
    const embed = new EmbedBuilder().setColor(COLOR).setTitle(`🏆 Top members in ${interaction.guild.name}`)
      .setDescription(rows.join('\n')).setFooter({ text: `Page ${page}/${pages}` });
    return reply(interaction, { embeds: [embed] });
  },
};
