const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { parseDuration, formatDuration } = require('../utils/time');
const { checkTarget, botMissing, guildData, save, ensurePrison } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prison')
    .setDescription('Prison a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((o) => o.setName('member').setDescription('Member to prison').setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription('Length, e.g. 30m, 2h, 1d (empty = until released)'))
    .addStringOption((o) => o.setName('reason').setDescription('Reason')),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageChannels);
    if (missing) return fail(interaction, missing);

    const member = await interaction.guild.members.fetch(interaction.options.getUser('member').id).catch(() => null);
    const err = checkTarget(interaction, member);
    if (err) return fail(interaction, err);

    const d = guildData(interaction.guildId);
    if (d.prisons[member.id]) return fail(interaction, '❌ That member is already imprisoned.');

    const durationInput = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    let ms = null;
    if (durationInput) {
      ms = parseDuration(durationInput);
      if (!ms) return fail(interaction, '❌ Invalid duration. Use something like `30m`, `2h`, `1d`.');
    }

    await interaction.deferReply();
    const { role, channel } = await ensurePrison(interaction.guild);

    // Save the roles we can take away and give back later; keep managed/locked roles untouched.
    const removable = member.roles.cache.filter((r) => r.id !== interaction.guildId && !r.managed && r.editable && r.id !== role.id);
    const keep = member.roles.cache.filter((r) => r.id !== interaction.guildId && (r.managed || !r.editable));

    d.prisons[member.id] = {
      roles: [...removable.keys()], until: ms ? Date.now() + ms : null,
      reason, by: interaction.user.id, at: Date.now(),
    };
    save();

    await member.roles.set([...keep.keys(), role.id], `${interaction.user.tag}: ${reason}`);
    if (member.voice.channelId) await member.voice.disconnect('Imprisoned').catch(() => {});
    return reply(interaction, `⛓️ ${member} was sent to prison${ms ? ` for **${formatDuration(ms)}**` : ''} (${channel}). Reason: ${reason}`);
  },
};
