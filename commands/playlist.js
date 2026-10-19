const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const { reply, fail, trunc, COLOR } = require('../utils/common');
const { states, resolveTrack, getOrJoin, advance, fmtTime } = require('../utils/music');

const store = db.open('playlists'); // userId -> { [name]: { tracks: [], created, updated } }
const MAX_LISTS = 25;
const MAX_TRACKS = 200;
const PER_PAGE = 10;

const lists = (uid) => (store.data[uid] ??= {});
const findName = (l, name) => Object.keys(l).find((k) => k.toLowerCase() === name.trim().toLowerCase());
const slim = (t) => ({ title: t.title, url: t.url, duration: t.duration, thumbnail: t.thumbnail, author: t.author });
const nameOpt = (s) => s.addStringOption((o) => o.setName('playlist').setDescription('Playlist name').setAutocomplete(true).setRequired(true));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Create and manage your playlists')
    .addSubcommand((s) => s.setName('create').setDescription('Create a new playlist')
      .addStringOption((o) => o.setName('name').setDescription('Name of the new playlist').setMaxLength(50).setRequired(true)))
    .addSubcommand((s) => nameOpt(s.setName('delete').setDescription('Delete one of your playlists')))
    .addSubcommand((s) => nameOpt(s.setName('add').setDescription('Add a track to your playlist'))
      .addStringOption((o) => o.setName('query').setDescription('Track name or YouTube URL (empty = the track playing now)')))
    .addSubcommand((s) => nameOpt(s.setName('remove').setDescription('Remove a track from your playlist'))
      .addIntegerOption((o) => o.setName('position').setDescription('Track position').setMinValue(1).setRequired(true)))
    .addSubcommand((s) => nameOpt(s.setName('view').setDescription('View all tracks of your playlist'))
      .addIntegerOption((o) => o.setName('page').setDescription('Page number').setMinValue(1)))
    .addSubcommand((s) => nameOpt(s.setName('edit').setDescription('Edit your playlist'))
      .addStringOption((o) => o.setName('rename').setDescription('New name for the playlist').setMaxLength(50))
      .addIntegerOption((o) => o.setName('move_from').setDescription('Position of the track to move').setMinValue(1))
      .addIntegerOption((o) => o.setName('move_to').setDescription('New position for that track').setMinValue(1))
      .addBooleanOption((o) => o.setName('clear').setDescription('Remove every track from the playlist')))
    .addSubcommand((s) => s.setName('list').setDescription('Your playlists'))
    .addSubcommand((s) => nameOpt(s.setName('play').setDescription('Play a playlist'))
      .addBooleanOption((o) => o.setName('shuffle').setDescription('Shuffle the tracks'))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const names = Object.keys(lists(interaction.user.id)).filter((n) => n.toLowerCase().includes(focused)).slice(0, 25);
    await interaction.respond(names.map((n) => ({ name: n, value: n })));
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const mine = lists(interaction.user.id);

    if (sub === 'create') {
      const name = interaction.options.getString('name').trim();
      if (findName(mine, name)) return fail(interaction, '❌ You already have a playlist with that name.');
      if (Object.keys(mine).length >= MAX_LISTS) return fail(interaction, `❌ You can have at most ${MAX_LISTS} playlists.`);
      mine[name] = { tracks: [], created: Date.now(), updated: Date.now() };
      store.save();
      return reply(interaction, `✅ Created playlist **${name}**. Add tracks with \`/playlist add\`.`);
    }

    if (sub === 'list') {
      const entries = Object.entries(mine);
      if (!entries.length) return reply(interaction, "📭 You don't have any playlists yet. Create one with `/playlist create`.");
      const embed = new EmbedBuilder().setColor(COLOR).setTitle(`🎼 ${interaction.user.username}'s playlists`)
        .setDescription(entries.map(([n, p], i) => `**${i + 1}.** ${n} — ${p.tracks.length} track(s)`).join('\n'));
      return reply(interaction, { embeds: [embed] });
    }

    // Every other subcommand needs an existing playlist.
    const name = findName(mine, interaction.options.getString('playlist'));
    if (!name) return fail(interaction, "❌ You don't have a playlist with that name.");
    const pl = mine[name];

    if (sub === 'delete') {
      delete mine[name];
      store.save();
      return reply(interaction, `🗑️ Deleted playlist **${name}**.`);
    }

    if (sub === 'add') {
      if (pl.tracks.length >= MAX_TRACKS) return fail(interaction, `❌ A playlist can hold at most ${MAX_TRACKS} tracks.`);
      const query = interaction.options.getString('query');
      await interaction.deferReply();
      const track = query
        ? await resolveTrack(query, interaction.user.id)
        : states.get(interaction.guildId)?.current;
      if (!track) return reply(interaction, query ? '❌ No results found.' : '❌ Nothing is playing. Provide a `query`.');
      pl.tracks.push(slim(track));
      pl.updated = Date.now();
      store.save();
      return reply(interaction, `✅ Added **${trunc(track.title, 80)}** to **${name}** (#${pl.tracks.length}).`);
    }

    if (sub === 'remove') {
      const pos = interaction.options.getInteger('position');
      if (pos > pl.tracks.length) return fail(interaction, `❌ **${name}** only has ${pl.tracks.length} track(s).`);
      const [removed] = pl.tracks.splice(pos - 1, 1);
      pl.updated = Date.now();
      store.save();
      return reply(interaction, `🗑️ Removed **${trunc(removed.title, 80)}** from **${name}**.`);
    }

    if (sub === 'view') {
      const pages = Math.max(1, Math.ceil(pl.tracks.length / PER_PAGE));
      const page = Math.min(interaction.options.getInteger('page') ?? 1, pages);
      const start = (page - 1) * PER_PAGE;
      const rows = pl.tracks.slice(start, start + PER_PAGE)
        .map((t, i) => `**${start + i + 1}.** [${trunc(t.title, 60)}](${t.url}) \`${fmtTime(t.duration)}\``);
      const total = pl.tracks.reduce((n, t) => n + (t.duration || 0), 0);
      const embed = new EmbedBuilder().setColor(COLOR).setTitle(`🎼 ${name}`)
        .setDescription(rows.join('\n') || '*This playlist is empty.*')
        .setFooter({ text: `Page ${page}/${pages} • ${pl.tracks.length} track(s) • ${fmtTime(total)}` });
      return reply(interaction, { embeds: [embed] });
    }

    if (sub === 'edit') {
      const rename = interaction.options.getString('rename')?.trim();
      const from = interaction.options.getInteger('move_from');
      const to = interaction.options.getInteger('move_to');
      const clear = interaction.options.getBoolean('clear');
      if (!rename && !clear && from === null && to === null) {
        return fail(interaction, '❌ Provide something to change: `rename`, `move_from` + `move_to`, or `clear`.');
      }
      const changes = [];
      if (clear) { pl.tracks = []; changes.push('cleared all tracks'); }
      if (from !== null || to !== null) {
        if (from === null || to === null) return fail(interaction, '❌ Use `move_from` and `move_to` together.');
        if (from > pl.tracks.length || to > pl.tracks.length) return fail(interaction, `❌ **${name}** only has ${pl.tracks.length} track(s).`);
        const [moved] = pl.tracks.splice(from - 1, 1);
        pl.tracks.splice(to - 1, 0, moved);
        changes.push(`moved **${trunc(moved.title, 50)}** to #${to}`);
      }
      let finalName = name;
      if (rename && rename.toLowerCase() !== name.toLowerCase()) {
        if (findName(mine, rename)) return fail(interaction, '❌ You already have a playlist with that name.');
        delete mine[name];
        mine[rename] = pl;
        finalName = rename;
        changes.push(`renamed to **${rename}**`);
      }
      pl.updated = Date.now();
      store.save();
      return reply(interaction, `✏️ Updated **${finalName}**: ${changes.join(', ')}.`);
    }

    if (sub === 'play') {
      if (!pl.tracks.length) return fail(interaction, '❌ That playlist is empty.');
      const state = await getOrJoin(interaction);
      if (!state) return;
      let tracks = pl.tracks.map((t) => ({ ...t, requestedBy: interaction.user.id }));
      if (interaction.options.getBoolean('shuffle')) tracks = tracks.sort(() => Math.random() - 0.5);
      state.queue.push(...tracks);
      if (!state.current) await advance(state, true);
      return reply(interaction, `▶️ Queued **${tracks.length}** track(s) from **${name}**.`);
    }
  },
};
