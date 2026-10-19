const { SlashCommandBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply, fail } = require('../utils/common');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('golds')
    .setDescription('View or transfer gold')
    .addUserOption((o) => o.setName('member').setDescription('Member to view, or to send gold to'))
    .addIntegerOption((o) => o.setName('amount').setDescription('Amount of gold to transfer to that member').setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getUser('member');
    const amount = interaction.options.getInteger('amount');

    if (amount === null) {
      const user = target || interaction.user;
      return reply(interaction, `🪙 ${user.id === interaction.user.id ? 'You have' : `${user} has`} **${L.user(interaction.guildId, user.id).golds.toLocaleString()}** golds.`);
    }

    if (!target) return fail(interaction, '❌ Pick the `member` you want to send gold to.');
    if (target.bot) return fail(interaction, "❌ You can't send gold to a bot.");
    if (target.id === interaction.user.id) return fail(interaction, "❌ You can't send gold to yourself.");

    const from = L.user(interaction.guildId, interaction.user.id);
    if (from.golds < amount) return fail(interaction, `❌ You only have **${from.golds.toLocaleString()}** golds.`);

    from.golds -= amount;
    L.user(interaction.guildId, target.id).golds += amount;
    L.save();
    return reply(interaction, `🪙 ${interaction.user} sent **${amount.toLocaleString()}** golds to ${target}.`);
  },
};
