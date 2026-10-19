// Background loop: ends giveaways and expires temporary bans, mutes and prison sentences.
const mod = require('./mod');
const giveaways = require('./giveaways');

async function tick(client) {
  const now = Date.now();

  for (const [id, g] of Object.entries(giveaways.store.data)) {
    if (!g.ended && !g.cancelled && g.endsAt <= now) {
      await giveaways.endGiveaway(client, id).catch((e) => console.error('Giveaway end failed:', e.message));
    }
  }

  for (const guild of client.guilds.cache.values()) {
    const d = mod.guildData(guild.id);
    for (const [uid, e] of Object.entries(d.tempBans)) {
      if (e.until <= now) {
        await guild.members.unban(uid, 'Temporary ban expired').catch(() => {});
        delete d.tempBans[uid];
        mod.save();
      }
    }
    for (const [uid, e] of Object.entries(d.mutes)) if (e.until && e.until <= now) await mod.releaseMute(guild, uid);
    for (const [uid, e] of Object.entries(d.voiceMutes)) if (e.until && e.until <= now) await mod.releaseVoiceMute(guild, uid);
    for (const [uid, e] of Object.entries(d.prisons)) if (e.until && e.until <= now) await mod.releasePrison(guild, uid);
  }
}

function start(client) {
  setInterval(() => tick(client).catch((e) => console.error('Task tick failed:', e)), 15_000);
}

module.exports = { start };
