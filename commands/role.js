const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { reply, fail } = require('../utils/common');
const { checkTarget, botMissing } = require('../utils/mod');

const addOptions = (s) => s
  .addRoleOption((o) => o.setName('role').setDescription('The role').setRequired(true))
  .addUserOption((o) => o.setName('member').setDescription('A single member'))
  .addRoleOption((o) => o.setName('members_of').setDescription('Apply to every member that has this role'))
  .addBooleanOption((o) => o.setName('everyone').setDescription('Apply to every member of the server'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription("Assign or remove roles from a member, server, or role's members")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => addOptions(s.setName('add').setDescription('Assign a role')))
    .addSubcommand((s) => addOptions(s.setName('remove').setDescription('Remove a role'))),

  async execute(interaction) {
    const missing = botMissing(interaction, PermissionFlagsBits.ManageRoles);
    if (missing) return fail(interaction, missing);

    const adding = interaction.options.getSubcommand() === 'add';
    const role = interaction.options.getRole('role');
    const single = interaction.options.getUser('member');
    const membersOf = interaction.options.getRole('members_of');
    const everyone = interaction.options.getBoolean('everyone');

    if ([single, membersOf, everyone].filter(Boolean).length !== 1) {
      return fail(interaction, '❌ Choose exactly one target: `member`, `members_of` or `everyone`.');
    }
    if (role.managed || role.id === interaction.guildId) return fail(interaction, "❌ That role can't be assigned manually.");
    if (role.position >= interaction.guild.members.me.roles.highest.position) return fail(interaction, '❌ That role is higher than or equal to my highest role.');
    if (interaction.guild.ownerId !== interaction.user.id && role.position >= interaction.member.roles.highest.position) {
      return fail(interaction, '❌ That role is higher than or equal to your highest role.');
    }

    await interaction.deferReply();

    if (single) {
      const member = await interaction.guild.members.fetch(single.id).catch(() => null);
      const err = checkTarget(interaction, member, { allowSelf: true });
      if (err) return reply(interaction, err);
      if (adding) await member.roles.add(role); else await member.roles.remove(role);
      return reply(interaction, `✅ ${adding ? 'Added' : 'Removed'} ${role} ${adding ? 'to' : 'from'} ${member}.`);
    }

    const all = await interaction.guild.members.fetch();
    const pool = everyone ? all : all.filter((m) => m.roles.cache.has(membersOf.id));
    const targets = pool.filter((m) => m.roles.cache.has(role.id) !== adding && m.manageable);

    let done = 0, failed = 0;
    for (const m of targets.values()) {
      try {
        if (adding) await m.roles.add(role); else await m.roles.remove(role);
        done++;
      } catch { failed++; }
    }
    const scope = everyone ? 'the server' : `members of ${membersOf}`;
    return reply(interaction, `✅ ${adding ? 'Added' : 'Removed'} ${role} ${adding ? 'to' : 'from'} **${done}** member(s) in ${scope}.${failed ? ` (${failed} failed)` : ''}`);
  },
};
