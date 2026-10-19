const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { reply, fail, COLOR } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("View a member's or a server's avatar")
    .addUserOption((o) => o.setName('member').setDescription('Member to look up (default: you)'))
    .addBooleanOption((o) => o.setName('server').setDescription('Show the server icon instead')),

  async execute(interaction) {
    if (interaction.options.getBoolean('server')) {
      const url = interaction.guild.iconURL({ size: 1024 });
      if (!url) return fail(interaction, "❌ This server doesn't have an icon.");
      return reply(interaction, { embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`${interaction.guild.name}'s icon`).setImage(url).setURL(url)] });
    }

    const user = interaction.options.getUser('member') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const global = user.displayAvatarURL({ size: 1024 });
    const local = member?.avatar ? member.displayAvatarURL({ size: 1024 }) : null;

    const embed = new EmbedBuilder().setColor(COLOR).setTitle(`${user.displayName}'s avatar`)
      .setImage(local || global).setURL(local || global);
    if (local) embed.setDescription(`[Global avatar](${global}) • Showing their server avatar`);
    return reply(interaction, { embeds: [embed] });
  },
};
