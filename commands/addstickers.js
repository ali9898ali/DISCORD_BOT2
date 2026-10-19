const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addstickers')
    .setDescription('Add stickers from other servers or image attachments to your server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .addStringOption((o) => o.setName('message_link').setDescription('Link to a message that contains a sticker from another server'))
    .addAttachmentOption((o) => o.setName('image').setDescription('Or upload a PNG/APNG/GIF (max 512 KB) to use as a sticker'))
    .addStringOption((o) => o.setName('name').setDescription('Sticker name (2-30 characters)').setMinLength(2).setMaxLength(30))
    .addStringOption((o) => o.setName('tag').setDescription('Related emoji or word used for suggestions (default: sticker)').setMaxLength(200)),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageGuildExpressions);
    if (missing) return fail(interaction, missing);

    const link = interaction.options.getString('message_link');
    const image = interaction.options.getAttachment('image');
    const name = interaction.options.getString('name');
    const tags = interaction.options.getString('tag') || 'sticker';
    if (!link && !image) return fail(interaction, '❌ Provide a `message_link` with a sticker or upload an `image`.');

    await interaction.deferReply();
    const jobs = [];

    if (link) {
      const m = link.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
      if (!m || m[1] !== interaction.guildId) return reply(interaction, '❌ Use a message link from **this** server (the bot must be able to read that message).');
      const channel = await interaction.client.channels.fetch(m[2]).catch(() => null);
      if (!channel?.permissionsFor(interaction.member)?.has(PermissionFlagsBits.ViewChannel)) return reply(interaction, "❌ I can't access that message.");
      const message = await channel.messages.fetch(m[3]).catch(() => null);
      if (!message?.stickers.size) return reply(interaction, '❌ That message has no stickers.');
      for (const s of message.stickers.values()) jobs.push({ name: name && message.stickers.size === 1 ? name : s.name, url: s.url, tags });
    }
    if (image) {
      if (!['image/png', 'image/gif', 'image/apng'].includes(image.contentType)) return reply(interaction, '❌ Stickers must be PNG, APNG or GIF.');
      if (image.size > 512 * 1024) return reply(interaction, '❌ The image must be 512 KB or smaller.');
      jobs.push({ name: name || image.name.replace(/\.[^.]+$/, '').slice(0, 30).padEnd(2, '_'), url: image.url, tags });
    }

    const added = [], failed = [];
    for (const job of jobs) {
      try {
        added.push(await interaction.guild.stickers.create({
          file: job.url, name: job.name, tags: job.tags, reason: `Added by ${interaction.user.tag}`,
        }));
      } catch (err) {
        failed.push(`\`${job.name}\` (${err.message.slice(0, 60)})`);
      }
    }
    return reply(interaction, [
      added.length ? `✅ Added sticker(s): ${added.map((s) => `**${s.name}**`).join(', ')}` : null,
      failed.length ? `❌ Failed: ${failed.join(', ')}` : null,
    ].filter(Boolean).join('\n'));
  },
};
