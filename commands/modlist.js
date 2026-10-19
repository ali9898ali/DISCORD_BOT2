const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { reply, trunc, COLOR } = require('../utils/common');
const { ts } = require('../utils/time');
const { guildData } = require('../utils/mod');

const lines = (obj, withReason = true) => {
  const rows = Object.entries(obj).map(([id, e]) =>
    `<@${id}> — ${e.until ? `until ${ts(e.until)}` : 'indefinite'}${withReason && e.reason ? ` • ${trunc(e.reason, 40)}` : ''}`);
  return trunc(rows.join('\n') || '*None*', 1024);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlist')
    .setDescription('View all members currently muted, imprisoned, or temporarily banned')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const d = guildData(interaction.guildId);
    const timedOut = interaction.guild.members.cache
      .filter((m) => m.isCommunicationDisabled())
      .map((m) => `${m} — until ${ts(m.communicationDisabledUntilTimestamp)}`);

    const embed = new EmbedBuilder().setColor(COLOR).setTitle('🛡️ Active punishments')
      .addFields(
        { name: `🔇 Text muted (${Object.keys(d.mutes).length})`, value: lines(d.mutes) },
        { name: `🎙️ Voice muted (${Object.keys(d.voiceMutes).length})`, value: lines(d.voiceMutes) },
        { name: `⛓️ Imprisoned (${Object.keys(d.prisons).length})`, value: lines(d.prisons) },
        { name: `🔨 Temporarily banned (${Object.keys(d.tempBans).length})`, value: lines(d.tempBans) },
        { name: `⏳ Timed out (${timedOut.length})`, value: trunc(timedOut.join('\n') || '*None*', 1024) },
      )
      .setFooter({ text: 'Timeouts are listed from cached members only' });
    return reply(interaction, { embeds: [embed] });
  },
};
