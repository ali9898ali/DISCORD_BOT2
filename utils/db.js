// Tiny JSON-file store: db.open('name') -> { data, save() }. Writes are debounced and atomic.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DIR, { recursive: true });
const stores = new Map();

function open(name) {
  if (stores.has(name)) return stores.get(name);
  const file = path.join(DIR, `${name}.json`);
  let data = {};
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* new store */ }

  let timer = null;
  const store = {
    data,
    save() { clearTimeout(timer); timer = setTimeout(store.flush, 500); },
    flush() {
      clearTimeout(timer);
      try {
        fs.writeFileSync(`${file}.tmp`, JSON.stringify(store.data));
        fs.renameSync(`${file}.tmp`, file);
      } catch (err) { console.error(`Failed to save ${name}:`, err.message); }
    },
  };
  stores.set(name, store);
  return store;
}

const flushAll = () => stores.forEach((s) => s.flush());
process.on('exit', flushAll);
process.on('SIGINT', () => { flushAll(); process.exit(0); });
process.on('SIGTERM', () => { flushAll(); process.exit(0); });

module.exports = { open };
