const { SlashCommandBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply, fail } = require('../utils/common');
const { ts } = require('../utils/time');

const DAY = 24 * 36e5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily golds'),

  async execute(interaction) {
    const u = L.user(interaction.guildId, interaction.user.id);
    const now = Date.now();
    if (now - u.lastDaily < DAY) return fail(interaction, `⏳ You already claimed your daily. Come back ${ts(u.lastDaily + DAY)}.`);

    // Streak continues if the last claim was within 48h, otherwise it restarts.
    u.streak = now - u.lastDaily < 2 * DAY && u.lastDaily ? u.streak + 1 : 1;
    u.bestStreak = Math.max(u.bestStreak, u.streak);
    u.lastDaily = now;

    const reward = 100 + Math.min(u.streak - 1, 30) * 10;
    u.golds += reward;
    L.save();
    return reply(interaction, `🪙 You claimed **${reward}** golds!\n🔥 Streak: **${u.streak}** day(s) • Balance: **${u.golds.toLocaleString()}**`);
  },
};
