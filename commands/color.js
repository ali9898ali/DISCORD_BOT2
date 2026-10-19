const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { botMissing } = require('../utils/mod');
const { PALETTE, PREFIX } = require('../utils/palette');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Change or remove the current color')
    .addStringOption((o) => o.setName('color').setDescription('A color from /colors')
      .addChoices(...Object.keys(PALETTE).map((n) => ({ name: n, value: n }))))
    .addStringOption((o) => o.setName('hex').setDescription('Or any custom hex color, e.g. #ff8800'))
    .addBooleanOption((o) => o.setName('remove').setDescription('Remove your current color')),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageRoles);
    if (missing) return fail(interaction, missing);

    const member = interaction.member;
    const old = member.roles.cache.filter((r) => r.name.startsWith(PREFIX));
    const remove = interaction.options.getBoolean('remove');
    const preset = interaction.options.getString('color');
    const hexInput = interaction.options.getString('hex');

    if (remove) {
      if (!old.size) return fail(interaction, "❌ You don't have a color to remove.");
      await member.roles.remove([...old.keys()]);
      return reply(interaction, '🎨 Your color was removed.');
    }

    let name, hex;
    if (preset) { name = preset; hex = PALETTE[preset]; }
    else if (hexInput) {
      const m = hexInput.trim().match(/^#?([0-9a-f]{6})$/i);
      if (!m) return fail(interaction, '❌ Invalid hex color. Use something like `#ff8800`.');
      hex = `#${m[1].toLowerCase()}`;
      name = hex;
    } else return fail(interaction, '❌ Pick a `color`, give a `hex`, or set `remove: true`.');

    await interaction.deferReply();
    const roleName = `${PREFIX}${name}`;
    let role = interaction.guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      role = await interaction.guild.roles.create({
        name: roleName, color: hex, permissions: [], reason: 'Color role',
        position: Math.max(1, interaction.guild.members.me.roles.highest.position - 1),
      });
    }
    if (role.position >= interaction.guild.members.me.roles.highest.position) return reply(interaction, "❌ That color role is above my highest role, so I can't assign it.");

    if (old.size) await member.roles.remove([...old.keys()]);
    await member.roles.add(role);
    return reply(interaction, `🎨 Your color is now ${role}.`);
  },
};
