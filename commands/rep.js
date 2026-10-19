const { SlashCommandBuilder } = require('discord.js');
const L = require('../utils/levels');
const { reply, fail } = require('../utils/common');
const { ts } = require('../utils/time');

const COOLDOWN = 24 * 36e5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Give rep to someone')
    .addUserOption((o) => o.setName('member').setDescription('Member to give rep to').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('member');
    if (target.bot) return fail(interaction, "❌ You can't give rep to a bot.");
    if (target.id === interaction.user.id) return fail(interaction, "❌ You can't give rep to yourself.");

    const giver = L.user(interaction.guildId, interaction.user.id);
    if (Date.now() - giver.lastRep < COOLDOWN) {
      return fail(interaction, `⏳ You can give rep again ${ts(giver.lastRep + COOLDOWN)}.`);
    }
    giver.lastRep = Date.now();
    const receiver = L.user(interaction.guildId, target.id);
    receiver.rep++;
    L.save();
    return reply(interaction, `⭐ ${interaction.user} gave a rep point to ${target}! They now have **${receiver.rep}** rep.`);
  },
};
