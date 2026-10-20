require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const {
  Client, Collection, Events, GatewayIntentBits, MessageFlags, REST, Routes, ActivityType,
} = require('discord.js');

const { states, destroyState, EMPTY_LEAVE_MS } = require('./utils/music');
const mod = require('./utils/mod');
const levels = require('./utils/levels');
const tasks = require('./utils/tasks');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,      // privileged: enable "Server Members Intent" in the developer portal
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,     // XP from chatting (message content is NOT needed)
  ],
});

/* ------------------------------------------------------------------ */
/* Load commands: every file in ./commands exports { data, execute }   */
/* ------------------------------------------------------------------ */
client.commands = new Collection();
client.buttons = new Collection(); // customId prefix -> command that handles it

const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsDir, file));
  if (!command?.data || typeof command.execute !== 'function') {
    console.warn(`[WARN] ${file} is missing "data" or "execute", skipping.`);
    continue;
  }
  const name = command.data.name;
  if (client.commands.has(name)) {
    console.warn(`[WARN] Duplicate command "${name}" in ${file}, skipping.`);
    continue;
  }
  client.commands.set(name, command);
  if (command.buttonPrefix) client.buttons.set(command.buttonPrefix, command);
}

/* ------------------------------------------------------------------ */
/* Ready: register slash commands and start background tasks           */
/* ------------------------------------------------------------------ */
client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  c.user.setActivity('/play', { type: ActivityType.Listening });

  // 🚀 تشغيل لوحة التحكم الخاصة بالبوت (A_77-System Dashboard)
  require('./dashboard')(c);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const body = [...c.commands.values()].map((cmd) => cmd.data.toJSON());
  const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(c.user.id, process.env.GUILD_ID)
    : Routes.applicationCommands(c.user.id);
  await rest.put(route, { body });
  console.log(`Registered ${body.length} commands.`);

  tasks.start(c);
});

/* ------------------------------------------------------------------ */
/* Interactions: slash commands, autocomplete, buttons                 */
/* ------------------------------------------------------------------ */
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    return command?.autocomplete?.(interaction).catch(() => {});
  }

  let command;
  let run;
  if (interaction.isChatInputCommand()) {
    command = client.commands.get(interaction.commandName);
    run = command?.execute;
    if (run && !interaction.inGuild()) {
      return interaction.reply({ content: '❌ This command only works inside a server.', flags: MessageFlags.Ephemeral });
    }
  } else if (interaction.isButton()) {
    const entry = [...client.buttons.entries()].find(([prefix]) => interaction.customId.startsWith(prefix));
    command = entry?.[1];
    run = command?.button;
  }
  if (!run) return;

  try {
    await run.call(command, interaction);
  } catch (err) {
    console.error(`Interaction error (${interaction.commandName || interaction.customId}):`, err);
    const content = '⚠️ Something went wrong while running that.';
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content, components: [] }).catch(() => {});
    else await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

/* ------------------------------------------------------------------ */
/* Chat XP: 15-25 XP per minute of chatting                            */
/* ------------------------------------------------------------------ */
client.on(Events.MessageCreate, (message) => {
  if (!message.guild || message.author.bot || message.webhookId) return;

  const u = levels.user(message.guildId, message.author.id);
  const now = Date.now();
  if (now - u.lastXp < 60_000) return;

  const before = levels.levelFromXp(u.xp);
  u.xp += 15 + Math.floor(Math.random() * 11);
  u.lastXp = now;
  u.messages++;
  levels.save();

  const after = levels.levelFromXp(u.xp);
  if (after > before) message.channel.send(`🎉 ${message.author} reached **level ${after}**!`).catch(() => {});
});

/* ------------------------------------------------------------------ */
/* Voice: stored voice mutes, bot disconnects, empty-channel leave     */
/* ------------------------------------------------------------------ */
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  // Re-apply a stored voice mute when a muted member joins a voice channel.
  if (newState.channelId && !oldState.channelId && !newState.member.user.bot) {
    if (mod.guildData(newState.guild.id).voiceMutes[newState.id] && !newState.serverMute) {
      await newState.setMute(true, 'Active voice mute').catch(() => {});
    }
  }

  const state = states.get(oldState.guild.id);
  if (!state) return;

  // The bot itself was disconnected from voice
  if (oldState.id === client.user.id && !newState.channelId) return destroyState(state);

  // Leave when everyone else has left (unless 24/7 mode is on)
  const channel = state.guild.channels.cache.get(state.connection.joinConfig.channelId);
  if (!channel) return;
  clearTimeout(state.emptyTimer);
  if (channel.members.filter((m) => !m.user.bot).size === 0 && !state.stay) {
    state.emptyTimer = setTimeout(() => {
      state.textChannel?.send('👋 Left the voice channel because it was empty.').catch(() => {});
      destroyState(state);
    }, EMPTY_LEAVE_MS);
  }
});

/* ------------------------------------------------------------------ */
/* Moderation upkeep                                                   */
/* ------------------------------------------------------------------ */
// New channels automatically respect the Muted / Prisoner roles.
client.on(Events.ChannelCreate, (channel) => mod.applyNewChannel(channel).catch(() => {}));

// Re-apply mute / prison if someone leaves and rejoins to dodge a punishment.
client.on(Events.GuildMemberAdd, async (member) => {
  const d = mod.guildData(member.guild.id);
  const roles = [];
  if (d.mutes[member.id] && d.roles.muted) roles.push(d.roles.muted);
  if (d.prisons[member.id] && d.roles.prison) roles.push(d.roles.prison);
  if (roles.length) await member.roles.add(roles, 'Active punishment').catch(() => {});
});

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
client.login(process.env.DISCORD_TOKEN);
