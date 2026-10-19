const { SlashCommandBuilder } = require('discord.js');
const { reply, fail } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Check if you can vote or not'),

  async execute(interaction) {
    const token = process.env.TOPGG_TOKEN;
    const voteUrl = process.env.VOTE_URL || `https://top.gg/bot/${interaction.client.user.id}/vote`;
    if (!token) {
      return fail(interaction, `ℹ️ Vote checking isn't configured yet (the owner must set \`TOPGG_TOKEN\`).\nYou can vote here: ${voteUrl}`);
    }

    await interaction.deferReply();
    try {
      const res = await fetch(`https://top.gg/api/bots/check?userId=${interaction.user.id}`, { headers: { Authorization: token } });
      if (!res.ok) throw new Error(`top.gg responded with ${res.status}`);
      const { voted } = await res.json();
      return reply(interaction, voted
        ? `✅ You already voted in the last 12 hours — thank you! You can vote again later: ${voteUrl}`
        : `🗳️ You can vote now! Vote here: ${voteUrl}`);
    } catch (err) {
      console.error('Vote check failed:', err.message);
      return reply(interaction, `❌ Couldn't check your vote right now. You can vote here: ${voteUrl}`);
    }
  },
};
