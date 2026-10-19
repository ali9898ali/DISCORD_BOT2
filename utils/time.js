const UNITS = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };

/** "1h30m", "7d", "45s" -> milliseconds (null if invalid). */
function parseDuration(input) {
  if (!input) return null;
  const s = input.trim();
  if (!/^(\d+\s*[smhdw]\s*)+$/i.test(s)) return null;
  let ms = 0, m;
  const re = /(\d+)\s*([smhdw])/gi;
  while ((m = re.exec(s))) ms += Number(m[1]) * UNITS[m[2].toLowerCase()];
  return ms || null;
}

function formatDuration(ms) {
  const parts = [];
  for (const [label, size] of [['d', 864e5], ['h', 36e5], ['m', 6e4], ['s', 1e3]]) {
    const n = Math.floor(ms / size);
    if (n) { parts.push(`${n}${label}`); ms -= n * size; }
  }
  return parts.join(' ') || '0s';
}

/** Discord timestamp markdown. */
const ts = (ms, style = 'R') => `<t:${Math.floor(ms / 1000)}:${style}>`;

module.exports = { parseDuration, formatDuration, ts };
