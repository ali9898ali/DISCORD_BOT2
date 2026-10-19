const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { parseDuration, formatDuration } = require('../utils/time');
const G = require('../utils/giveaways');

module.exports = {
  buttonPrefix: 'giveaway_',

  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Run giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('start').setDescription('Start a giveaway')
      .addStringOption((o) => o.setName('prize').setDescription('What are you giving away?').setMaxLength(200).setRequired(true))
      .addStringOption((o) => o.setName('duration').setDescription('How long it runs, e.g. 30m, 2h, 1d').setRequired(true))
      .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20))
      .addChannelOption((o) => o.setName('channel').setDescription('Channel to post in (default: here)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addRoleOption((o) => o.setName('required_role').setDescription('Only members with this role can enter')))
    .addSubcommand((s) => s.setName('reroll').setDescription('Select a new winner for the giveaway')
      .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID (default: the latest ended one)'))
      .addIntegerOption((o) => o.setName('winners').setDescription('How many new winners (default 1)').setMinValue(1).setMaxValue(20)))
    .addSubcommand((s) => s.setName('end').setDescription('Force end a giveaway and choose winners')
      .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID (default: the latest active one)')))
    .addSubcommand((s) => s.setName('cancel').setDescription('Cancel and delete a giveaway')
      .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID (default: the latest active one)'))),

  /** "Join" button: toggles the member's entry. */
  async button(interaction) {
    const g = G.store.data[interaction.message.id];
    const ephemeral = { flags: MessageFlags.Ephemeral };
    if (!g || g.ended || g.cancelled) return interaction.reply({ content: '❌ This giveaway has ended.', ...ephemeral });
    if (g.requiredRole && !interaction.member.roles.cache.has(g.requiredRole)) {
      return interaction.reply({ content: `❌ You need the <@&${g.requiredRole}> role to enter.`, ...ephemeral });
    }
    const idx = g.entries.indexOf(interaction.user.id);
    if (idx === -1) g.entries.push(interaction.user.id); else g.entries.splice(idx, 1);
    G.store.save();
    await interaction.update({ embeds: [G.buildEmbed(g)] });
    return interaction.followUp({ content: idx === -1 ? '🎉 You entered the giveaway!' : '👋 You left the giveaway.', ...ephemeral });
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const ms = parseDuration(interaction.options.getString('duration'));
      if (!ms || ms < 10_000) return fail(interaction, '❌ Invalid duration (minimum 10s). Use something like `30m`, `2h`, `1d`.');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const role = interaction.options.getRole('required_role');
      const g = {
        guildId: interaction.guildId, channelId: channel.id, prize: interaction.options.getString('prize'),
        winners: interaction.options.getInteger('winners') ?? 1, hostId: interaction.user.id,
        endsAt: Date.now() + ms, createdAt: Date.now(), entries: [], winnerIds: [],
        ended: false, cancelled: false, requiredRole: role?.id || null,
      };
      const message = await channel.send({ embeds: [G.buildEmbed(g)], components: [G.buildRow()] });
      G.store.data[message.id] = g;
      G.store.save();
      return reply(interaction, `🎉 Giveaway started in ${channel} for **${formatDuration(ms)}**: ${message.url}`);
    }

    const found = G.findGiveaway(interaction.guildId, interaction.options.getString('message_id'), sub === 'reroll');
    if (!found) return fail(interaction, '❌ No matching giveaway found.');
    const [id, g] = found;

    if (sub === 'end') {
      if (g.ended || g.cancelled) return fail(interaction, '❌ That giveaway already ended.');
      await interaction.deferReply();
      await G.endGiveaway(interaction.client, id);
      return reply(interaction, `✅ Ended the giveaway for **${g.prize}**.`);
    }

    if (sub === 'reroll') {
      if (!g.ended) return fail(interaction, "❌ That giveaway hasn't ended yet. Use `/giveaway end` first.");
      await interaction.deferReply();
      const winners = await G.rerollGiveaway(interaction.client, id, interaction.options.getInteger('winners') ?? 1);
      return reply(interaction, winners.length ? '🔁 Rerolled!' : '❌ There are no entries to pick from.');
    }

    // cancel
    if (g.ended || g.cancelled) return fail(interaction, '❌ That giveaway already ended.');
    await interaction.deferReply();
    const channel = await interaction.client.channels.fetch(g.channelId).catch(() => null);
    const message = channel ? await channel.messages.fetch(id).catch(() => null) : null;
    await message?.delete().catch(() => {});
    delete G.store.data[id];
    G.store.save();
    return reply(interaction, `🛑 Cancelled the giveaway for **${g.prize}**.`);
  },
};
