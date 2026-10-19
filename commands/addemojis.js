const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing } = require('../utils/mod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addemojis')
    .setDescription('Add emojis from other servers or image attachments to your server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .addStringOption((o) => o.setName('emojis').setDescription('Paste one or more custom emojis from other servers'))
    .addAttachmentOption((o) => o.setName('image').setDescription('Or upload an image to use as an emoji'))
    .addStringOption((o) => o.setName('name').setDescription('Name for the uploaded image (2-32 letters, numbers, _)').setMinLength(2).setMaxLength(32)),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageGuildExpressions);
    if (missing) return fail(interaction, missing);

    const text = interaction.options.getString('emojis') || '';
    const image = interaction.options.getAttachment('image');
    const jobs = [];

    for (const [, animated, name, id] of text.matchAll(/<(a?):(\w{2,32}):(\d{15,25})>/g)) {
      jobs.push({ name, url: `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=128` });
    }
    if (image) {
      if (!image.contentType?.startsWith('image/')) return fail(interaction, '❌ The attachment must be an image.');
      const base = (interaction.options.getString('name') || image.name.replace(/\.[^.]+$/, '')).replace(/[^\w]/g, '_').slice(0, 32);
      jobs.push({ name: base.length >= 2 ? base : 'emoji', url: image.url });
    }
    if (!jobs.length) return fail(interaction, '❌ Paste custom emojis in `emojis` or upload an `image`.');
    if (jobs.length > 20) return fail(interaction, '❌ Please add at most 20 emojis at a time.');

    await interaction.deferReply();
    const added = [], failed = [];
    for (const job of jobs) {
      try {
        added.push(await interaction.guild.emojis.create({ attachment: job.url, name: job.name, reason: `Added by ${interaction.user.tag}` }));
      } catch (err) {
        failed.push(`\`${job.name}\` (${err.message.slice(0, 60)})`);
      }
    }
    return reply(interaction, [
      added.length ? `✅ Added ${added.length} emoji(s): ${added.join(' ')}` : null,
      failed.length ? `❌ Failed: ${failed.join(', ')}` : null,
    ].filter(Boolean).join('\n'));
  },
};
