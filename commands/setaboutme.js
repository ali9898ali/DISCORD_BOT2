const { SlashCommandBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setaboutme')
    .setDescription('Set about me for profile command')
    .addStringOption((o) => o.setName('text').setDescription('Your about me (leave empty to clear it)').setMaxLength(150)),

  async execute(interaction) {
    const text = interaction.options.getString('text') || '';
    L.user(interaction.guildId, interaction.user.id).aboutMe = text;
    L.save();
    return reply(interaction, text ? '✅ Your about me was updated.' : '✅ Your about me was cleared.');
  },
};
