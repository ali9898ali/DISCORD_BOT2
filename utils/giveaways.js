const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./db');
const { ts } = require('./time');

const store = db.open('giveaways'); // messageId -> giveaway

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pickWinners = (entries, count, exclude = []) =>
  shuffle(entries.filter((id) => !exclude.includes(id))).slice(0, count);

function buildEmbed(g) {
  const e = new EmbedBuilder().setTitle(`🎉 ${g.prize}`).setTimestamp(g.endsAt);
  if (g.ended) {
    e.setColor(0x57f287).setDescription([
      `**Winner(s):** ${g.winnerIds.length ? g.winnerIds.map((id) => `<@${id}>`).join(', ') : 'No valid entries'}`,
      `**Hosted by:** <@${g.hostId}>`,
      `**Entries:** ${g.entries.length}`,
    ].join('\n')).setFooter({ text: 'Giveaway ended' });
  } else {
    e.setColor(0x5865f2).setDescription([
      'Click the button below to enter!',
      '',
      `**Ends:** ${ts(g.endsAt)} (${ts(g.endsAt, 'f')})`,
      `**Winners:** ${g.winners}`,
      `**Hosted by:** <@${g.hostId}>`,
      `**Entries:** ${g.entries.length}`,
      g.requiredRole ? `**Required role:** <@&${g.requiredRole}>` : null,
    ].filter(Boolean).join('\n')).setFooter({ text: 'Ends at' });
  }
  return e;
}

const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('giveaway_join').setLabel('Join').setEmoji('🎉')
    .setStyle(ButtonStyle.Primary).setDisabled(disabled),
);

async function fetchMessage(client, g, id) {
  const channel = await client.channels.fetch(g.channelId).catch(() => null);
  const message = channel ? await channel.messages.fetch(id).catch(() => null) : null;
  return { channel, message };
}

/** Ends a giveaway: picks winners, updates the message and announces. Returns the giveaway or null. */
async function endGiveaway(client, id) {
  const g = store.data[id];
  if (!g || g.ended || g.cancelled) return null;
  g.ended = true;
  g.winnerIds = pickWinners(g.entries, g.winners);
  store.save();

  const { channel, message } = await fetchMessage(client, g, id);
  await message?.edit({ embeds: [buildEmbed(g)], components: [buildRow(true)] }).catch(() => {});
  await channel?.send(g.winnerIds.length
    ? `🎉 Congratulations ${g.winnerIds.map((w) => `<@${w}>`).join(', ')}! You won **${g.prize}**!`
    : `😢 No valid entries for **${g.prize}**, so there is no winner.`).catch(() => {});
  return g;
}

/** Picks new winners for an ended giveaway. Returns the new winner ids (possibly empty). */
async function rerollGiveaway(client, id, count) {
  const g = store.data[id];
  let winners = pickWinners(g.entries, count, g.winnerIds);
  if (!winners.length) winners = pickWinners(g.entries, count);
  g.winnerIds = winners;
  store.save();

  const { channel, message } = await fetchMessage(client, g, id);
  await message?.edit({ embeds: [buildEmbed(g)] }).catch(() => {});
  await channel?.send(winners.length
    ? `🔁 New winner(s) for **${g.prize}**: ${winners.map((w) => `<@${w}>`).join(', ')}`
    : `😢 Nobody entered **${g.prize}**, so there is nobody to pick.`).catch(() => {});
  return winners;
}

/** Resolve a giveaway by message id, or the most recent active/ended one in the guild. */
function findGiveaway(guildId, messageId, wantEnded) {
  if (messageId) {
    const g = store.data[messageId];
    return g && g.guildId === guildId ? [messageId, g] : null;
  }
  const list = Object.entries(store.data)
    .filter(([, g]) => g.guildId === guildId && !g.cancelled && Boolean(g.ended) === wantEnded)
    .sort((a, b) => b[1].createdAt - a[1].createdAt);
  return list[0] || null;
}

module.exports = { store, buildEmbed, buildRow, endGiveaway, rerollGiveaway, findGiveaway };
