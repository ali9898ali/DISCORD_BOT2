const {
  SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType,
} = require('discord.js');
const { getOrJoin, searchYouTube, advance, reply, trunc, fmtTime } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for YouTube tracks to add to the queue')
    .addStringOption((o) => o.setName('query').setDescription('What to search for').setRequired(true)),

  async execute(interaction) {
    const state = await getOrJoin(interaction);
    if (!state) return;

    await interaction.deferReply();
    const results = await searchYouTube(interaction.options.getString('query'), 10, interaction.user.id);
    if (!results.length) return reply(interaction, '❌ No results found.');

    const customId = `search:${interaction.id}`;
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Select tracks to add to the queue')
      .setMinValues(1)
      .setMaxValues(results.length)
      .addOptions(results.map((t, i) => ({
        label: trunc(t.title, 100),
        description: trunc(`${t.author} • ${fmtTime(t.duration)}`, 100),
        value: String(i),
      })));

    const msg = await reply(interaction, {
      content: '🔎 **Search results**',
      components: [new ActionRowBuilder().addComponents(menu)],
    });

    try {
      const selection = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        filter: (c) => c.user.id === interaction.user.id && c.customId === customId,
      });
      const picked = selection.values.map((v) => results[Number(v)]);
      state.queue.push(...picked);
      if (!state.current) await advance(state, true);
      await selection.update({ content: `✅ Added **${picked.length}** track(s) to the queue.`, components: [] });
    } catch {
      await interaction.editReply({ content: '⌛ Search timed out.', components: [] }).catch(() => {});
    }
  },
};
