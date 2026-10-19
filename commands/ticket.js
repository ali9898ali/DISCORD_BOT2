const {
  SlashCommandBuilder, PermissionFlagsBits: P, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const db = require('../utils/db');
const { reply, fail, trunc, COLOR } = require('../utils/common');
const { ts } = require('../utils/time');

const store = db.open('tickets');
const STAFF_ROLE = process.env.TICKET_STAFF_ROLE_ID || null;
const MAX_OPEN = 3;

const data = (gid) => (store.data[gid] ??= { counter: 0, categoryId: null, tickets: {}, points: {} });
const isStaff = (m) => m.permissions.has(P.ManageChannels) || (STAFF_ROLE && m.roles.cache.has(STAFF_ROLE));
const pad = (n) => String(n).padStart(4, '0');
const NOT_TICKET = '❌ This channel is not a ticket.';
const TICKET_PERMS = { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true, EmbedLinks: true };

function current(i) {
  const d = data(i.guildId);
  return { d, t: d.tickets[i.channelId] };
}
const canManage = (i, t) => isStaff(i.member) || t.ownerId === i.user.id;

const row = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Success),
);

/* ------------------------------ actions ------------------------------ */
async function create(i) {
  const d = data(i.guildId);
  const open = Object.values(d.tickets).filter((t) => t.ownerId === i.user.id && t.status === 'open');
  if (open.length >= MAX_OPEN) return fail(i, `❌ You already have ${open.length} open tickets (<#${open[0].channelId}>...). Close one first.`);

  await i.deferReply({ flags: 64 });
  let category = d.categoryId && i.guild.channels.cache.get(d.categoryId);
  if (!category) {
    category = await i.guild.channels.create({
      name: 'Tickets', type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: i.guild.roles.everyone.id, deny: [P.ViewChannel] }],
    });
    d.categoryId = category.id;
  }

  d.counter++;
  const reason = i.options.getString('reason') || 'No reason provided';
  const overwrites = [
    { id: i.guild.roles.everyone.id, deny: [P.ViewChannel] },
    { id: i.user.id, allow: Object.keys(TICKET_PERMS) },
    { id: i.client.user.id, allow: [...Object.keys(TICKET_PERMS), 'ManageChannels'] },
  ];
  if (STAFF_ROLE) overwrites.push({ id: STAFF_ROLE, allow: Object.keys(TICKET_PERMS) });

  const channel = await i.guild.channels.create({
    name: `ticket-${pad(d.counter)}`, type: ChannelType.GuildText, parent: category.id,
    topic: `Ticket #${pad(d.counter)} • owner: ${i.user.id}`, permissionOverwrites: overwrites,
  });
  d.tickets[channel.id] = {
    number: d.counter, ownerId: i.user.id, status: 'open', claimedBy: null,
    users: [], reason, createdAt: Date.now(), pointAwarded: false,
  };
  store.save();

  const embed = new EmbedBuilder().setColor(COLOR).setTitle(`🎫 Ticket #${pad(d.counter)}`)
    .setDescription(`Hello ${i.user}, staff will be with you shortly.\n\n**Reason:** ${trunc(reason, 500)}`)
    .setTimestamp();
  await channel.send({ content: `${i.user}${STAFF_ROLE ? ` <@&${STAFF_ROLE}>` : ''}`, embeds: [embed], components: [row()] });
  return reply(i, `✅ Your ticket was created: ${channel}`);
}

async function close(i) {
  const { d, t } = current(i);
  if (!t) return fail(i, NOT_TICKET);
  if (t.status === 'closed') return fail(i, '❌ This ticket is already closed.');
  if (!canManage(i, t)) return fail(i, "❌ You can't close this ticket.");

  t.status = 'closed';
  t.closedBy = i.user.id;
  if (t.claimedBy && isStaff(i.member) && !t.pointAwarded) {
    d.points[t.claimedBy] = (d.points[t.claimedBy] || 0) + 1;
    t.pointAwarded = true;
  }
  store.save();

  for (const uid of [t.ownerId, ...t.users]) {
    await i.channel.permissionOverwrites.edit(uid, { SendMessages: false }).catch(() => {});
  }
  i.channel.setName(`closed-${pad(t.number)}`).catch(() => {});
  return reply(i, `🔒 Ticket closed by ${i.user}. Use \`/ticket reopen\` to reopen it or \`/ticket delete\` to delete it.`);
}

async function claim(i) {
  const { t } = current(i);
  if (!t) return fail(i, NOT_TICKET);
  if (!isStaff(i.member)) return fail(i, '❌ Only staff can claim tickets.');
  if (t.claimedBy) return fail(i, `❌ This ticket is already claimed by <@${t.claimedBy}>.`);
  t.claimedBy = i.user.id;
  store.save();
  return reply(i, `🙋 ${i.user} claimed this ticket.`);
}

/* ------------------------------ command ------------------------------ */
module.exports = {
  buttonPrefix: 'ticket_',

  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Support ticket system')
    .addSubcommand((s) => s.setName('create').setDescription('Create a ticket')
      .addStringOption((o) => o.setName('reason').setDescription('What do you need help with?').setMaxLength(500)))
    .addSubcommand((s) => s.setName('close').setDescription('Close a ticket'))
    .addSubcommand((s) => s.setName('delete').setDescription('Delete a ticket'))
    .addSubcommand((s) => s.setName('reopen').setDescription('Reopen a ticket'))
    .addSubcommand((s) => s.setName('add_user').setDescription('Add a member to a ticket')
      .addUserOption((o) => o.setName('member').setDescription('Member to add').setRequired(true)))
    .addSubcommand((s) => s.setName('remove_user').setDescription('Remove a member from a ticket')
      .addUserOption((o) => o.setName('member').setDescription('Member to remove').setRequired(true)))
    .addSubcommand((s) => s.setName('claim').setDescription('Claim the ticket'))
    .addSubcommand((s) => s.setName('unclaim').setDescription('Unclaim the ticket'))
    .addSubcommand((s) => s.setName('rename').setDescription('Rename the ticket')
      .addStringOption((o) => o.setName('name').setDescription('New channel name').setMaxLength(80).setRequired(true)))
    .addSubcommandGroup((g) => g.setName('points').setDescription('Ticket points')
      .addSubcommand((s) => s.setName('list').setDescription('View ticket points'))
      .addSubcommand((s) => s.setName('reset_user').setDescription('Reset ticket points')
        .addUserOption((o) => o.setName('member').setDescription('Staff member to reset').setRequired(true))))
    .addSubcommand((s) => s.setName('notify').setDescription('Send a notification to the members of the ticket')
      .addStringOption((o) => o.setName('message').setDescription('Message to send').setMaxLength(1000).setRequired(true))),

  async button(interaction) {
    if (interaction.customId === 'ticket_close') return close(interaction);
    if (interaction.customId === 'ticket_claim') return claim(interaction);
  },

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') return create(interaction);
    if (sub === 'close') return close(interaction);
    if (sub === 'claim') return claim(interaction);

    if (group === 'points') {
      const d = data(interaction.guildId);
      if (!isStaff(interaction.member)) return fail(interaction, '❌ Only staff can use this.');
      if (sub === 'list') {
        const entries = Object.entries(d.points).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 25);
        const embed = new EmbedBuilder().setColor(COLOR).setTitle('🏅 Ticket points')
          .setDescription(entries.length ? entries.map(([id, n], i) => `**${i + 1}.** <@${id}> — **${n}**`).join('\n') : 'Nobody has ticket points yet.')
          .setFooter({ text: 'Staff earn a point when a ticket they claimed gets closed' });
        return reply(interaction, { embeds: [embed] });
      }
      if (!interaction.memberPermissions.has(P.ManageGuild)) return fail(interaction, '❌ You need **Manage Server** to reset points.');
      const user = interaction.options.getUser('member');
      delete d.points[user.id];
      store.save();
      return reply(interaction, `♻️ Reset ticket points for ${user}.`);
    }

    // Everything below must run inside a ticket channel.
    const { d, t } = current(interaction);
    if (!t) return fail(interaction, NOT_TICKET);

    if (sub === 'delete') {
      if (!isStaff(interaction.member)) return fail(interaction, '❌ Only staff can delete tickets.');
      await reply(interaction, '🗑️ Deleting this ticket in 5 seconds...');
      delete d.tickets[interaction.channelId];
      store.save();
      return void setTimeout(() => interaction.channel.delete(`Ticket deleted by ${interaction.user.tag}`).catch(() => {}), 5000);
    }

    if (sub === 'reopen') {
      if (t.status !== 'closed') return fail(interaction, "❌ This ticket isn't closed.");
      if (!canManage(interaction, t)) return fail(interaction, "❌ You can't reopen this ticket.");
      t.status = 'open';
      t.pointAwarded = false;
      store.save();
      for (const uid of [t.ownerId, ...t.users]) {
        await interaction.channel.permissionOverwrites.edit(uid, { SendMessages: true }).catch(() => {});
      }
      interaction.channel.setName(`ticket-${pad(t.number)}`).catch(() => {});
      return reply(interaction, `🔓 Ticket reopened by ${interaction.user}.`);
    }

    if (sub === 'add_user' || sub === 'remove_user') {
      if (!canManage(interaction, t)) return fail(interaction, "❌ You can't manage this ticket.");
      const user = interaction.options.getUser('member');
      if (user.id === t.ownerId) return fail(interaction, "❌ You can't change the ticket owner's access.");
      if (sub === 'add_user') {
        if (t.users.includes(user.id)) return fail(interaction, '❌ That member is already in this ticket.');
        await interaction.channel.permissionOverwrites.edit(user.id, { ...TICKET_PERMS, SendMessages: t.status === 'open' });
        t.users.push(user.id);
        store.save();
        return reply(interaction, `➕ Added ${user} to the ticket.`);
      }
      if (!t.users.includes(user.id)) return fail(interaction, "❌ That member wasn't added to this ticket.");
      await interaction.channel.permissionOverwrites.delete(user.id);
      t.users = t.users.filter((id) => id !== user.id);
      store.save();
      return reply(interaction, `➖ Removed ${user} from the ticket.`);
    }

    if (sub === 'unclaim') {
      if (!t.claimedBy) return fail(interaction, "❌ This ticket isn't claimed.");
      if (t.claimedBy !== interaction.user.id && !interaction.memberPermissions.has(P.ManageGuild)) {
        return fail(interaction, '❌ Only the claimer (or a server manager) can unclaim it.');
      }
      t.claimedBy = null;
      store.save();
      return reply(interaction, `↩️ ${interaction.user} unclaimed this ticket.`);
    }

    if (sub === 'rename') {
      if (!canManage(interaction, t)) return fail(interaction, "❌ You can't rename this ticket.");
      const name = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9-_ ]/g, '').trim().replace(/\s+/g, '-') || `ticket-${pad(t.number)}`;
      await interaction.channel.setName(name);
      return reply(interaction, `✏️ Ticket renamed to **${name}**.`);
    }

    if (sub === 'notify') {
      if (!isStaff(interaction.member)) return fail(interaction, '❌ Only staff can send notifications.');
      const message = interaction.options.getString('message');
      const ids = [...new Set([t.ownerId, ...t.users])];
      let dms = 0;
      for (const id of ids) {
        const user = await interaction.client.users.fetch(id).catch(() => null);
        const sent = await user?.send(`🔔 Update on your ticket **#${pad(t.number)}** in **${interaction.guild.name}**:\n${message}\n${interaction.channel}`).then(() => true).catch(() => false);
        if (sent) dms++;
      }
      return reply(interaction, `🔔 ${ids.map((id) => `<@${id}>`).join(' ')}\n${message}\n*(Sent by ${interaction.user} • ${dms}/${ids.length} DM(s) delivered • opened ${ts(t.createdAt)})*`);
    }
  },
};
