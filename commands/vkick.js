const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply } = require('../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vkick')
    .setDescription('Kick a member from a voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member to kick from voice').setRequired(true)),

  async execute(interaction) {
    const target = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);

    if (!target?.voice.channel) return reply(interaction, "❌ That member isn't in a voice channel.");
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
      return reply(interaction, '❌ I need the **Move Members** permission.');
    }
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    if (!isOwner && target.roles.highest.position >= interaction.member.roles.highest.position) {
      return reply(interaction, "❌ You can't kick someone with an equal or higher role.");
    }
    await target.voice.disconnect(`Voice kicked by ${interaction.user.tag}`);
    return reply(interaction, `👢 Kicked ${target} from voice.`);
  },
};
