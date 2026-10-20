const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('./data/auth.db');
db.prepare(`
  CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT PRIMARY KEY,
    username TEXT,
    scopes TEXT,
    authorized_at DATETIME
  )
`).run();

const configPath = './data/config.json';
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({
    prefix: '!',
    welcomeEnabled: false,
    welcomeChannel: 'welcome',
    welcomeMessage: 'Welcome {user} to {server}!',
    autoRoles: [],
    commands: {},
    aliases: { 'addemoji': 'steal-emoji' },
    embeds: { title: '', description: '', color: '#5865F2', footer: '', thumbnail: '' },
    language: 'en',
    loggingChannel: ''
  }, null, 2));
}

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (e) { return {}; }
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

module.exports = function(client) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // تم تثبيت اسم المستخدم وكلمة المرور هنا مباشرة لسهولة الدخول
  app.use(basicAuth({
    users: { 'admin': 'admin123' },
    challenge: true,
    realm: 'A_77-System Dashboard'
  }));

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/stats', (req, res) => {
    try {
      const guildCount = client.guilds.cache.size;
      const userCount = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
      const authCount = db.prepare('SELECT COUNT(*) as count FROM auth_users').get().count;

      res.json({
        online: client.ws.status === 0,
        guilds: guildCount,
        users: userCount,
        authUsers: authCount,
        uptime: client.uptime
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/auth-users', (req, res) => {
    try {
      const users = db.prepare('SELECT * FROM auth_users ORDER BY authorized_at DESC').all();
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/auth-users/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM auth_users WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/config', (req, res) => {
    res.json(loadConfig());
  });

  app.post('/api/config', (req, res) => {
    try {
      const cfg = loadConfig();
      const newCfg = Object.assign(cfg, req.body);
      saveConfig(newCfg);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/commands', (req, res) => {
    const cfg = loadConfig();
    const cmds = [];
    if (client.commands) {
      client.commands.forEach((cmd, name) => {
        cmds.push({
          name: name,
          category: cmd.category || 'General',
          enabled: cfg.commands[name] !== false,
          alias: cfg.aliases[name] || ''
        });
      });
    }
    res.json(cmds);
  });

  app.post('/api/commands/:name', (req, res) => {
    try {
      const { enabled, alias } = req.body;
      const cfg = loadConfig();
      if (enabled !== undefined) cfg.commands[req.params.name] = enabled;
      if (alias !== undefined) cfg.aliases[req.params.name] = alias;
      saveConfig(cfg);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/restart', (req, res) => {
    res.json({ success: true });
    setTimeout(() => process.exit(0), 1000);
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`A_77-System Dashboard running on port ${PORT}`);
  });
};
