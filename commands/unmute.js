const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing, guildData, releaseMute, releaseVoiceMute } = require('../utils/mod');

const addOptions = (s) => s.addUserOption((o) => o.setName('member').setDescription('Member to unmute').setRequired(true));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers | PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => addOptions(s.setName('text').setDescription('Unmute a member textually')))
    .addSubcommand((s) => addOptions(s.setName('voice').setDescription('Voice unmute a member'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const missing = botMissing(interaction, sub === 'text' ? PermissionFlagsBits.ManageRoles : PermissionFlagsBits.MuteMembers);
    if (missing) return fail(interaction, missing);

    const user = interaction.options.getUser('member');
    const d = guildData(interaction.guildId);
    const store = sub === 'text' ? d.mutes : d.voiceMutes;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const isMuted = store[user.id]
      || (sub === 'text' && member && d.roles.muted && member.roles.cache.has(d.roles.muted))
      || (sub === 'voice' && member?.voice.serverMute);
    if (!isMuted) return fail(interaction, `❌ ${user} isn't ${sub === 'text' ? 'text' : 'voice'} muted.`);

    await interaction.deferReply();
    if (sub === 'text') await releaseMute(interaction.guild, user.id);
    else await releaseVoiceMute(interaction.guild, user.id);
    return reply(interaction, `🔊 ${sub === 'text' ? 'Text' : 'Voice'} unmuted ${user}.`);
  },
};
