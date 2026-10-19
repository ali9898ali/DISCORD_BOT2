const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getOrJoin, scheduleIdleLeave, reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('24h')
    .setDescription('Keep the bot in the voice channel 24/7')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(interaction, '❌ You need the **Manage Server** permission to use this.');
    }
    const state = await getOrJoin(interaction);
    if (!state) return;

    state.stay = !state.stay;
    if (state.stay) {
      clearTimeout(state.idleTimer);
      clearTimeout(state.emptyTimer);
    } else if (!state.current) {
      scheduleIdleLeave(state);
    }
    return reply(interaction, state.stay
      ? "🕒 24/7 mode **enabled**. I'll stay in the voice channel."
      : '🕒 24/7 mode **disabled**.');
  },
};
