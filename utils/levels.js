// XP / gold / streak storage shared by the level & economy commands.
const db = require('./db');

const store = db.open('levels');

function user(gid, uid) {
  const g = (store.data[gid] ??= {});
  return (g[uid] ??= {
    xp: 0, golds: 0, rep: 0, streak: 0, bestStreak: 0,
    lastDaily: 0, lastRep: 0, lastXp: 0, messages: 0, aboutMe: '',
  });
}

const levelFromXp = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 100));
const xpForLevel = (level) => 100 * level * level;

/** Sorted [userId, data] pairs for a guild, best first. */
function ranking(gid, key = 'xp') {
  return Object.entries(store.data[gid] || {})
    .filter(([, d]) => d[key] > 0)
    .sort((a, b) => b[1][key] - a[1][key]);
}

function rankOf(gid, uid, key = 'xp') {
  const idx = ranking(gid, key).findIndex(([id]) => id === uid);
  return idx === -1 ? null : idx + 1;
}

/** Streak that is still alive (claimed within the last 48h). */
function activeStreak(u) {
  return Date.now() - u.lastDaily < 48 * 36e5 && u.lastDaily ? u.streak : 0;
}

module.exports = { store, user, levelFromXp, xpForLevel, ranking, rankOf, activeStreak, save: () => store.save() };
