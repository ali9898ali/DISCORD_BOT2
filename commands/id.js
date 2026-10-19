const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply, COLOR } = require('../utils/common');
const { ts } = require('../utils/time');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('id')
    .setDescription('View information about yourself or another member')
    .addUserOption((o) => o.setName('member').setDescription('Member to look up (default: you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('member') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const u = L.user(interaction.guildId, user.id);

    const embed = new EmbedBuilder().setColor(member?.displayColor || COLOR)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail((member || user).displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: `\`${user.id}\``, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account created', value: ts(user.createdTimestamp, 'D'), inline: true },
        { name: 'Joined server', value: member ? ts(member.joinedTimestamp, 'D') : 'Not in server', inline: true },
        { name: 'Level', value: `${L.levelFromXp(u.xp)} (${u.xp.toLocaleString()} points)`, inline: true },
        { name: 'Rank', value: L.rankOf(interaction.guildId, user.id) ? `#${L.rankOf(interaction.guildId, user.id)}` : 'Unranked', inline: true },
      );
    if (member) {
      const roles = member.roles.cache.filter((r) => r.id !== interaction.guildId).sort((a, b) => b.position - a.position);
      embed.addFields({ name: `Roles (${roles.size})`, value: roles.size ? [...roles.values()].slice(0, 15).join(' ') : 'None' });
    }
    return reply(interaction, { embeds: [embed] });
  },
};
