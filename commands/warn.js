const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const { reply, fail, trunc, COLOR } = require('../utils/common');
const { ts } = require('../utils/time');
const { checkTarget } = require('../utils/mod');

const store = db.open('warns'); // guildId -> { next, users: { userId: [warning] } }
const guild = (gid) => (store.data[gid] ??= { next: 1, users: {} });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Manage member warnings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('add').setDescription('Warn a member')
      .addUserOption((o) => o.setName('member').setDescription('Member to warn').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason for the warning').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription("Remove warnings from a member or the server's members")
      .addUserOption((o) => o.setName('member').setDescription('Remove warnings of this member'))
      .addIntegerOption((o) => o.setName('id').setDescription('Remove only the warning with this ID'))
      .addBooleanOption((o) => o.setName('all_members').setDescription('Clear the warnings of every member in the server')))
    .addSubcommand((s) => s.setName('list').setDescription('View member or server warnings')
      .addUserOption((o) => o.setName('member').setDescription('Member to look up (empty = whole server)'))),

  async execute(interaction) {
    const g = guild(interaction.guildId);
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('member');

    if (sub === 'add') {
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const err = checkTarget(interaction, member);
      if (err) return fail(interaction, err);

      const reason = interaction.options.getString('reason');
      const warning = { id: g.next++, reason, by: interaction.user.id, at: Date.now() };
      (g.users[user.id] ??= []).push(warning);
      store.save();
      await user.send(`⚠️ You were warned in **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => {});
      return reply(interaction, `⚠️ Warned ${user} (warning **#${warning.id}**, total **${g.users[user.id].length}**). Reason: ${reason}`);
    }

    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const all = interaction.options.getBoolean('all_members');

      if (id !== null) {
        for (const [uid, list] of Object.entries(g.users)) {
          if (user && uid !== user.id) continue;
          const idx = list.findIndex((w) => w.id === id);
          if (idx !== -1) {
            list.splice(idx, 1);
            if (!list.length) delete g.users[uid];
            store.save();
            return reply(interaction, `✅ Removed warning **#${id}** from <@${uid}>.`);
          }
        }
        return fail(interaction, `❌ No warning with ID **#${id}** found.`);
      }
      if (user) {
        const count = g.users[user.id]?.length || 0;
        if (!count) return fail(interaction, "❌ That member has no warnings.");
        delete g.users[user.id];
        store.save();
        return reply(interaction, `✅ Removed **${count}** warning(s) from ${user}.`);
      }
      if (all) {
        const count = Object.values(g.users).reduce((n, l) => n + l.length, 0);
        g.users = {};
        store.save();
        return reply(interaction, `✅ Cleared **${count}** warning(s) from the whole server.`);
      }
      return fail(interaction, '❌ Provide a `member`, a warning `id`, or set `all_members` to true.');
    }

    // list
    const embed = new EmbedBuilder().setColor(COLOR);
    if (user) {
      const list = g.users[user.id] || [];
      embed.setTitle(`⚠️ Warnings for ${user.tag}`).setDescription(list.length
        ? trunc(list.map((w) => `**#${w.id}** • ${ts(w.at)} • by <@${w.by}>\n${trunc(w.reason, 150)}`).join('\n\n'), 4000)
        : 'This member has no warnings.');
    } else {
      const entries = Object.entries(g.users).sort((a, b) => b[1].length - a[1].length);
      embed.setTitle('⚠️ Server warnings').setDescription(entries.length
        ? trunc(entries.slice(0, 25).map(([uid, l]) => `<@${uid}> — **${l.length}** warning(s)`).join('\n'), 4000)
        : 'Nobody has been warned yet.')
        .setFooter({ text: `${entries.reduce((n, [, l]) => n + l.length, 0)} total warning(s)` });
    }
    return reply(interaction, { embeds: [embed] });
  },
};
