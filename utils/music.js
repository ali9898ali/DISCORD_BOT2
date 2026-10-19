const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus,
  VoiceConnectionStatus, entersState, StreamType,
} = require('@discordjs/voice');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const ffmpegPath = require('ffmpeg-static') || 'ffmpeg';
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';

const IDLE_LEAVE_MS = 2 * 60 * 1000;
const EMPTY_LEAVE_MS = 60 * 1000;
const COLOR = 0xff0033;

/** guildId -> guild music state */
const states = new Map();

/* ----------------------------- Formatting ----------------------------- */
const isUrl = (s) => /^https?:\/\//i.test(s);
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function fmtTime(sec) {
  if (sec == null || !Number.isFinite(sec)) return 'LIVE';
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function parseTime(input) {
  const parts = input.trim().split(':').map(Number);
  if (parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function trackEmbed(title, t) {
  const e = new EmbedBuilder().setColor(COLOR).setTitle(title)
    .setDescription(`[${trunc(t.title, 100)}](${t.url})`)
    .addFields(
      { name: 'Channel', value: t.author, inline: true },
      { name: 'Duration', value: fmtTime(t.duration), inline: true },
      { name: 'Requested by', value: t.requestedBy ? `<@${t.requestedBy}>` : 'Unknown', inline: true },
    );
  if (t.thumbnail) e.setThumbnail(t.thumbnail);
  return e;
}

/* ----------------------------- YouTube ----------------------------- */
function toTrack(info, requestedBy) {
  const id = info.id;
  return {
    title: info.title || 'Unknown title',
    url: info.webpage_url || (id ? `https://www.youtube.com/watch?v=${id}` : info.url),
    duration: info.duration ?? null,
    thumbnail: info.thumbnail || info.thumbnails?.at(-1)?.url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null),
    author: info.uploader || info.channel || 'Unknown',
    requestedBy,
  };
}

async function searchYouTube(query, limit, requestedBy) {
  const { stdout } = await execFileAsync(
    YTDLP, ['--flat-playlist', '--dump-single-json', `ytsearch${limit}:${query}`],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  return (JSON.parse(stdout).entries || []).filter(Boolean).map((e) => toTrack(e, requestedBy));
}

/** Resolve a YouTube URL or search term into one track. */
async function resolveTrack(query, requestedBy) {
  if (isUrl(query)) {
    const { stdout } = await execFileAsync(
      YTDLP, ['--no-playlist', '--dump-single-json', '--skip-download', query],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    return toTrack(JSON.parse(stdout), requestedBy);
  }
  return (await searchYouTube(query, 1, requestedBy))[0] || null;
}

/** Direct audio URL from YouTube (fetched fresh each time because it expires). */
async function getStreamUrl(videoUrl) {
  const { stdout } = await execFileAsync(
    YTDLP, ['-f', 'bestaudio[acodec=opus]/bestaudio/best', '-g', '--no-playlist', videoUrl],
    { maxBuffer: 16 * 1024 * 1024 },
  );
  return stdout.trim().split('\n')[0];
}

/* ----------------------------- State / engine ----------------------------- */
function createState(guild, voiceChannel, textChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
  });
  const player = createAudioPlayer();
  connection.subscribe(player);

  const state = {
    guild, connection, player, textChannel,
    queue: [], current: null, resource: null, ffmpeg: null,
    repeat: 'off', volume: 50, offset: 0, stay: false, idleTimer: null, emptyTimer: null,
  };

  player.on(AudioPlayerStatus.Idle, () => { if (state.current) advance(state, false); });
  player.on('error', (err) => {
    console.error('Player error:', err.message);
    state.textChannel?.send('⚠️ Playback error, skipping to the next track.').catch(() => {});
    advance(state, true);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      destroyState(state);
    }
  });

  states.set(guild.id, state);
  return state;
}

function destroyState(state) {
  clearTimeout(state.idleTimer);
  clearTimeout(state.emptyTimer);
  state.queue = [];
  state.current = null;
  try { state.ffmpeg?.kill('SIGKILL'); } catch {}
  try { state.player.stop(true); } catch {}
  try { state.connection.destroy(); } catch {}
  states.delete(state.guild.id);
}

async function playTrack(state, track, offset = 0) {
  clearTimeout(state.idleTimer);
  try { state.ffmpeg?.kill('SIGKILL'); } catch {}

  const streamUrl = await getStreamUrl(track.url);
  const args = ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5'];
  if (offset > 0) args.push('-ss', String(offset));
  args.push('-i', streamUrl, '-vn', '-f', 's16le', '-ar', '48000', '-ac', '2', '-loglevel', 'error', 'pipe:1');

  const ff = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'ignore'] });
  const resource = createAudioResource(ff.stdout, { inputType: StreamType.Raw, inlineVolume: true });
  resource.volume.setVolume(state.volume / 100);

  state.ffmpeg = ff;
  state.resource = resource;
  state.current = track;
  state.offset = offset;
  state.player.play(resource);
}

/** Move to the next track. `manual` = triggered by skip/play (ignores track repeat). */
async function advance(state, manual) {
  const prev = state.current;
  let next;
  if (prev && state.repeat === 'track' && !manual) {
    next = prev;
  } else {
    if (prev && state.repeat === 'queue') state.queue.push(prev);
    next = state.queue.shift();
  }

  if (!next) {
    state.current = null;
    state.resource = null;
    state.offset = 0;
    try { state.ffmpeg?.kill('SIGKILL'); } catch {}
    state.player.stop(true);
    scheduleIdleLeave(state);
    return;
  }

  try {
    await playTrack(state, next);
    if (next !== prev || manual) {
      state.textChannel?.send({ embeds: [trackEmbed('🎶 Now playing', next)] }).catch(() => {});
    }
  } catch (err) {
    console.error('playTrack failed:', err.message);
    state.textChannel?.send(`⚠️ Couldn't play **${trunc(next.title, 80)}**, skipping.`).catch(() => {});
    state.current = null;
    if (state.queue.length) advance(state, true);
    else scheduleIdleLeave(state);
  }
}

function scheduleIdleLeave(state) {
  clearTimeout(state.idleTimer);
  if (state.stay) return;
  state.idleTimer = setTimeout(() => {
    state.textChannel?.send('👋 Left the voice channel due to inactivity.').catch(() => {});
    destroyState(state);
  }, IDLE_LEAVE_MS);
}

/** Seconds elapsed in the current track. */
function elapsed(state) {
  return state.resource ? state.offset + state.resource.playbackDuration / 1000 : 0;
}

/* ----------------------------- Interaction helpers ----------------------------- */
function reply(interaction, content) {
  const payload = typeof content === 'string' ? { content } : content;
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}

/**
 * Returns the guild's music state, joining the member's voice channel if `create` is true.
 * Replies with an error and returns null when the request is invalid.
 */
async function getOrJoin(interaction, { create = true } = {}) {
  const memberChannel = interaction.member.voice?.channel;
  let state = states.get(interaction.guildId);

  if (!memberChannel) { await reply(interaction, '❌ You need to be in a voice channel first.'); return null; }
  if (state && state.connection.joinConfig.channelId !== memberChannel.id) {
    await reply(interaction, '❌ You need to be in the same voice channel as me.'); return null;
  }
  if (!state) {
    if (!create) { await reply(interaction, "❌ I'm not in a voice channel."); return null; }
    const perms = memberChannel.permissionsFor(interaction.guild.members.me);
    if (!perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
      await reply(interaction, '❌ I need **Connect** and **Speak** permissions for that channel.'); return null;
    }
    state = createState(interaction.guild, memberChannel, interaction.channel);
  }
  state.textChannel = interaction.channel;
  return state;
}

/** Same as getOrJoin but never joins; used by commands that need an existing session. */
const needActive = (interaction) => getOrJoin(interaction, { create: false });

module.exports = {
  states, COLOR, EMPTY_LEAVE_MS,
  isUrl, trunc, fmtTime, parseTime, trackEmbed,
  searchYouTube, resolveTrack,
  createState, destroyState, playTrack, advance, scheduleIdleLeave, elapsed,
  reply, getOrJoin, needActive,
};
