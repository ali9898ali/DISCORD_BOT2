const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { states, reply, trunc, fmtTime, COLOR } = require('../utils/music');

const PER_PAGE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the list of upcoming tracks')
    .addIntegerOption((o) => o.setName('page').setDescription('Page number').setMinValue(1)),

  async execute(interaction) {
    const state = states.get(interaction.guildId);
    if (!state || (!state.current && !state.queue.length)) return reply(interaction, '📭 The queue is empty.');

    const pages = Math.max(1, Math.ceil(state.queue.length / PER_PAGE));
    const page = Math.min(interaction.options.getInteger('page') ?? 1, pages);
    const start = (page - 1) * PER_PAGE;
    const lines = state.queue.slice(start, start + PER_PAGE)
      .map((t, i) => `**${start + i + 1}.** [${trunc(t.title, 60)}](${t.url}) \`${fmtTime(t.duration)}\``);
    const total = state.queue.reduce((sum, t) => sum + (t.duration || 0), 0);

    const nowPlaying = state.current ? `**Now playing:** [${trunc(state.current.title, 60)}](${state.current.url})\n\n` : '';
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('📜 Queue')
      .setDescription(nowPlaying + (lines.join('\n') || '*No upcoming tracks.*'))
      .setFooter({ text: `Page ${page}/${pages} • ${state.queue.length} track(s) • ${fmtTime(total)} • Repeat: ${state.repeat}` });
    return reply(interaction, { embeds: [embed] });
  },
};
