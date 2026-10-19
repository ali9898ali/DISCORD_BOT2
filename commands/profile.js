const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply, COLOR } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your profile or someone else')
    .addUserOption((o) => o.setName('member').setDescription('Member to look up (default: you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('member') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const u = L.user(interaction.guildId, user.id);

    const level = L.levelFromXp(u.xp);
    const base = L.xpForLevel(level), next = L.xpForLevel(level + 1);
    const pct = Math.min(1, (u.xp - base) / (next - base));
    const bar = '█'.repeat(Math.round(pct * 15)) + '░'.repeat(15 - Math.round(pct * 15));
    const rank = L.rankOf(interaction.guildId, user.id);

    const embed = new EmbedBuilder().setColor(member?.displayColor || COLOR)
      .setAuthor({ name: `${user.displayName}'s profile`, iconURL: user.displayAvatarURL() })
      .setThumbnail((member || user).displayAvatarURL({ size: 256 }))
      .setDescription(u.aboutMe || '*No about me set. Use `/setaboutme`.*')
      .addFields(
        { name: 'Level', value: `**${level}**`, inline: true },
        { name: 'Rank', value: rank ? `**#${rank}**` : 'Unranked', inline: true },
        { name: 'Points', value: `**${u.xp.toLocaleString()}**`, inline: true },
        { name: 'Progress', value: `\`${bar}\` ${u.xp - base}/${next - base} XP to level ${level + 1}` },
        { name: '🪙 Golds', value: `**${u.golds.toLocaleString()}**`, inline: true },
        { name: '⭐ Rep', value: `**${u.rep}**`, inline: true },
        { name: '🔥 Streak', value: `**${L.activeStreak(u)}** day(s)`, inline: true },
      );
    return reply(interaction, { embeds: [embed] });
  },
};
