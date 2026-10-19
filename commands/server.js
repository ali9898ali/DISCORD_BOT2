const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { reply, COLOR } = require('../utils/common');
const { ts } = require('../utils/time');

module.exports = {
  data: new SlashCommandBuilder().setName('server').setDescription('View server information'),

  async execute(interaction) {
    const g = interaction.guild;
    await g.fetch();
    const count = (type) => g.channels.cache.filter((c) => c.type === type).size;

    const embed = new EmbedBuilder().setColor(COLOR).setTitle(g.name)
      .setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
        { name: 'ID', value: `\`${g.id}\``, inline: true },
        { name: 'Created', value: ts(g.createdTimestamp, 'D'), inline: true },
        { name: 'Members', value: `${g.memberCount}`, inline: true },
        { name: 'Channels', value: `💬 ${count(ChannelType.GuildText)} text • 🔊 ${count(ChannelType.GuildVoice)} voice • 📁 ${count(ChannelType.GuildCategory)} categories`, inline: true },
        { name: 'Roles', value: `${g.roles.cache.size - 1}`, inline: true },
        { name: 'Emojis / Stickers', value: `${g.emojis.cache.size} / ${g.stickers.cache.size}`, inline: true },
        { name: 'Boosts', value: `Level ${g.premiumTier} (${g.premiumSubscriptionCount || 0} boosts)`, inline: true },
        { name: 'Verification', value: String(g.verificationLevel), inline: true },
      );
    if (g.description) embed.setDescription(g.description);
    if (g.bannerURL()) embed.setImage(g.bannerURL({ size: 1024 }));
    return reply(interaction, { embeds: [embed] });
  },
};
