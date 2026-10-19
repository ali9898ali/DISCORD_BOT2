const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { reply, fail, COLOR } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription("View a member's or a server's banner")
    .addUserOption((o) => o.setName('member').setDescription('Member to look up (default: you)'))
    .addBooleanOption((o) => o.setName('server').setDescription('Show the server banner instead')),

  async execute(interaction) {
    if (interaction.options.getBoolean('server')) {
      const url = interaction.guild.bannerURL({ size: 1024 });
      if (!url) return fail(interaction, "❌ This server doesn't have a banner.");
      return reply(interaction, { embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`${interaction.guild.name}'s banner`).setImage(url).setURL(url)] });
    }

    const user = await interaction.client.users.fetch((interaction.options.getUser('member') || interaction.user).id, { force: true });
    const url = user.bannerURL({ size: 1024 });
    if (!url) return fail(interaction, `❌ ${user.displayName} doesn't have a banner.`);
    return reply(interaction, { embeds: [new EmbedBuilder().setColor(user.accentColor || COLOR).setTitle(`${user.displayName}'s banner`).setImage(url).setURL(url)] });
  },
};
