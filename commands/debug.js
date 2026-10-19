const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits: P, version } = require('discord.js');
const { reply, COLOR } = require('../utils/common');
const { states } = require('../utils/music');
const { formatDuration } = require('../utils/time');

const NEEDED = ['ViewChannel', 'SendMessages', 'EmbedLinks', 'Connect', 'Speak', 'ManageRoles', 'ManageChannels',
  'ManageMessages', 'ModerateMembers', 'KickMembers', 'BanMembers', 'MoveMembers', 'MuteMembers', 'ManageNicknames', 'ManageGuildExpressions', 'CreateInstantInvite'];

module.exports = {
  data: new SlashCommandBuilder().setName('debug').setDescription('Send information about the bot in this guild'),

  async execute(interaction) {
    const { client, guild } = interaction;
    const me = guild.members.me;
    const missing = NEEDED.filter((p) => !me.permissions.has(P[p]));
    const music = states.get(guild.id);

    const embed = new EmbedBuilder().setColor(COLOR).setTitle('🛠️ Bot debug info')
      .addFields(
        { name: 'Guild', value: `${guild.name}\n\`${guild.id}\``, inline: true },
        { name: 'Shard', value: `${guild.shardId}`, inline: true },
        { name: 'WS ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: 'Uptime', value: formatDuration(client.uptime), inline: true },
        { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
        { name: 'Versions', value: `Node ${process.version}\ndiscord.js ${version}`, inline: true },
        { name: 'Commands loaded', value: `${client.commands.size}`, inline: true },
        { name: 'Highest role', value: `${me.roles.highest} (position ${me.roles.highest.position})`, inline: true },
        {
          name: 'Music', inline: true,
          value: music
            ? `Channel: <#${music.connection.joinConfig.channelId}>\nQueue: ${music.queue.length}\nVolume: ${music.volume}%\nRepeat: ${music.repeat}\n24/7: ${music.stay ? 'on' : 'off'}`
            : 'Not connected',
        },
        { name: 'Missing permissions', value: missing.length ? missing.map((p) => `\`${p}\``).join(', ') : '✅ None' },
      );
    return reply(interaction, { embeds: [embed] });
  },
};
