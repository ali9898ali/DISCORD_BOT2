// Shared moderation helpers: permission checks, Muted/Prisoner roles, persistent punishment data.
const { PermissionFlagsBits: P, PermissionsBitField, ChannelType } = require('discord.js');
const db = require('./db');

const store = db.open('moderation');

function guildData(gid) {
  const d = (store.data[gid] ??= {});
  d.mutes ??= {}; d.voiceMutes ??= {}; d.prisons ??= {}; d.tempBans ??= {}; d.roles ??= {};
  return d;
}
const save = () => store.save();

/** Returns an error string if `member` can't be moderated by the invoker, otherwise null. */
function checkTarget(interaction, member, { allowSelf = false } = {}) {
  if (!member) return '❌ That member is not in this server.';
  if (member.id === interaction.user.id) return allowSelf ? null : "❌ You can't do that to yourself.";
  if (member.id === interaction.client.user.id) return "❌ I can't do that to myself.";
  if (member.id === interaction.guild.ownerId) return "❌ You can't do that to the server owner.";
  const invokerIsOwner = interaction.guild.ownerId === interaction.user.id;
  if (!invokerIsOwner && member.roles.highest.position >= interaction.member.roles.highest.position) {
    return '❌ That member has a role equal to or higher than yours.';
  }
  if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
    return '❌ That member has a role equal to or higher than mine.';
  }
  return null;
}

/** Error string if the bot lacks a permission in the guild, otherwise null. */
function botMissing(interaction, perm) {
  if (interaction.guild.members.me.permissions.has(perm)) return null;
  const names = new PermissionsBitField(perm).toArray().join(', ');
  return `❌ I need the **${names}** permission.`;
}

/* ---------------------------- Muted role ---------------------------- */
const applyMuted = (ch, role) => ch.permissionOverwrites?.edit(role, {
  SendMessages: false, SendMessagesInThreads: false, AddReactions: false,
  CreatePublicThreads: false, CreatePrivateThreads: false, Speak: false, Stream: false,
}).catch(() => {});

async function ensureMutedRole(guild) {
  const d = guildData(guild.id);
  let role = d.roles.muted && guild.roles.cache.get(d.roles.muted);
  if (!role) {
    role = await guild.roles.create({
      name: 'Muted', permissions: [], reason: 'Created for the mute command',
      position: Math.max(1, guild.members.me.roles.highest.position - 1),
    });
    d.roles.muted = role.id;
    save();
    for (const ch of guild.channels.cache.values()) await applyMuted(ch, role);
  }
  return role;
}

/* ---------------------------- Prison ---------------------------- */
const applyPrison = (ch, role) => ch.permissionOverwrites?.edit(role, { ViewChannel: false }).catch(() => {});

async function ensurePrison(guild) {
  const d = guildData(guild.id);
  let role = d.roles.prison && guild.roles.cache.get(d.roles.prison);
  let channel = d.roles.prisonChannel && guild.channels.cache.get(d.roles.prisonChannel);
  if (!role) {
    role = await guild.roles.create({
      name: 'Prisoner', permissions: [], reason: 'Created for the prison command',
      position: Math.max(1, guild.members.me.roles.highest.position - 1),
    });
    d.roles.prison = role.id;
  }
  if (!channel) {
    channel = await guild.channels.create({
      name: 'prison', type: ChannelType.GuildText, reason: 'Created for the prison command',
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
        { id: role.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] },
        { id: guild.members.me.id, allow: [P.ViewChannel, P.SendMessages] },
      ],
    });
    d.roles.prisonChannel = channel.id;
    for (const ch of guild.channels.cache.values()) {
      if (ch.id !== channel.id) await applyPrison(ch, role);
    }
  }
  save();
  return { role, channel };
}

/** Make newly created channels respect the Muted / Prisoner roles. */
async function applyNewChannel(channel) {
  if (!channel.guild) return;
  const d = guildData(channel.guild.id);
  const muted = d.roles.muted && channel.guild.roles.cache.get(d.roles.muted);
  const prison = d.roles.prison && channel.guild.roles.cache.get(d.roles.prison);
  if (muted) await applyMuted(channel, muted);
  if (prison && channel.id !== d.roles.prisonChannel) await applyPrison(channel, prison);
}

/* ---------------------------- Releasing punishments ---------------------------- */
async function releaseMute(guild, userId) {
  const d = guildData(guild.id);
  const role = d.roles.muted && guild.roles.cache.get(d.roles.muted);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member && role) await member.roles.remove(role, 'Mute ended').catch(() => {});
  delete d.mutes[userId];
  save();
}

async function releaseVoiceMute(guild, userId) {
  const d = guildData(guild.id);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member?.voice.channelId) await member.voice.setMute(false, 'Voice mute ended').catch(() => {});
  delete d.voiceMutes[userId];
  save();
}

async function releasePrison(guild, userId) {
  const d = guildData(guild.id);
  const entry = d.prisons[userId];
  const role = d.roles.prison && guild.roles.cache.get(d.roles.prison);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member) {
    if (role) await member.roles.remove(role, 'Released from prison').catch(() => {});
    const restore = (entry?.roles || []).filter((id) => {
      const r = guild.roles.cache.get(id);
      return r && r.editable && !r.managed;
    });
    if (restore.length) await member.roles.add(restore, 'Released from prison').catch(() => {});
  }
  delete d.prisons[userId];
  save();
}

module.exports = {
  guildData, save, checkTarget, botMissing,
  ensureMutedRole, ensurePrison, applyNewChannel,
  releaseMute, releaseVoiceMute, releasePrison,
};
