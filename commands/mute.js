const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { parseDuration, formatDuration } = require('../utils/time');
const { checkTarget, botMissing, guildData, save, ensureMutedRole } = require('../utils/mod');

const addOptions = (s) => s
  .addUserOption((o) => o.setName('member').setDescription('Member to mute').setRequired(true))
  .addStringOption((o) => o.setName('duration').setDescription('Length, e.g. 30m, 2h, 1d (empty = until unmuted)'))
  .addStringOption((o) => o.setName('reason').setDescription('Reason'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers | PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => addOptions(s.setName('text').setDescription('Mute a member textually')))
    .addSubcommand((s) => addOptions(s.setName('voice').setDescription('Voice mute a member'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const missing = botMissing(interaction, sub === 'text' ? PermissionFlagsBits.ManageRoles : PermissionFlagsBits.MuteMembers);
    if (missing) return fail(interaction, missing);

    const member = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);
    const err = checkTarget(interaction, member);
    if (err) return fail(interaction, err);

    const durationInput = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    let ms = null;
    if (durationInput) {
      ms = parseDuration(durationInput);
      if (!ms) return fail(interaction, '❌ Invalid duration. Use something like `30m`, `2h`, `1d`.');
    }
    const entry = { until: ms ? Date.now() + ms : null, reason, by: interaction.user.id, at: Date.now() };
    const d = guildData(interaction.guildId);
    const suffix = ms ? ` for **${formatDuration(ms)}**` : '';

    await interaction.deferReply();
    if (sub === 'text') {
      const role = await ensureMutedRole(interaction.guild);
      await member.roles.add(role, `${interaction.user.tag}: ${reason}`);
      d.mutes[member.id] = entry;
      save();
      return reply(interaction, `🔇 Text muted ${member}${suffix}. Reason: ${reason}`);
    }

    // Voice mute is stored so it is re-applied when the member (re)joins a voice channel.
    d.voiceMutes[member.id] = entry;
    save();
    if (member.voice.channelId) await member.voice.setMute(true, `${interaction.user.tag}: ${reason}`);
    return reply(interaction, `🎙️ Voice muted ${member}${suffix}${member.voice.channelId ? '' : " (they'll be muted when they join voice)"}. Reason: ${reason}`);
  },
};
