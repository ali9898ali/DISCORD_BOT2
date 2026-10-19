const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { reply, COLOR } = require('../utils/common');
const { PALETTE, PREFIX } = require('../utils/palette');

module.exports = {
  data: new SlashCommandBuilder().setName('colors').setDescription('Display a list of server colors'),

  async execute(interaction) {
    const roles = interaction.guild.roles.cache;
    const palette = Object.entries(PALETTE).map(([name, hex]) => {
      const role = roles.find((r) => r.name === `${PREFIX}${name}`);
      return `${role ? role : '⬤'} \`${hex}\` **${name}**${role ? ` — ${role.members.size} member(s)` : ''}`;
    });
    const custom = roles.filter((r) => r.name.startsWith(PREFIX) && !Object.keys(PALETTE).some((n) => r.name === `${PREFIX}${n}`));

    const embed = new EmbedBuilder().setColor(COLOR).setTitle('🎨 Server colors')
      .setDescription(`${palette.join('\n')}\n\nPick one with \`/color color:<name>\` or use any \`/color hex:#rrggbb\`.`);
    if (custom.size) embed.addFields({ name: 'Custom colors in use', value: [...custom.values()].slice(0, 20).join(' ') });
    return reply(interaction, { embeds: [embed] });
  },
};
