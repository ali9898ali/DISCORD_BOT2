# All-in-one Discord Bot

Music (streams straight from YouTube), playlists, moderation, tickets, giveaways, levels/economy and utilities.
64 slash commands, one file per command in `commands/`.

## Setup
1. Node.js 18.17+ and **yt-dlp** on your PATH (keep it updated; recent versions also want a JS runtime such as Deno for YouTube).
2. `npm install`
3. Copy `.env.example` to `.env` and fill it in.
4. In the Discord Developer Portal enable the **Server Members Intent** (privileged). Message Content intent is *not* needed.
5. Invite the bot with scopes `bot` + `applications.commands`. Easiest: give it **Administrator**, or at least: Manage Roles, Manage Channels, Manage Messages, Manage Nicknames, Manage Expressions, Kick/Ban/Moderate/Move/Mute Members, Create Invite, Connect, Speak, Embed Links.
6. `npm start`

> Keep the bot's role **above** the roles it should manage (Muted, Prisoner, color roles, member roles).

## Structure
```
index.js        entry point: loads commands/, registers them, handles events
package.json
README.md
commands/       command files only (one per command): module.exports = { data, execute }
utils/          helpers: music engine, JSON database, moderation, levels, giveaways, scheduler, ...
data/           JSON files created at runtime (playlists, warns, tickets, levels, ...)
```
A command file may also export `autocomplete(interaction)` and `buttonPrefix` + `button(interaction)`.
Duplicate command names are skipped with a warning, so nothing is registered twice.

## Commands
**Music:** play, playnext, search, volume, join, leave, nowplaying, pause, resume, skip, skipto, stop, repeat, seek, queue, remove, 24h, move, moveme, vkick
**Playlist:** `/playlist` create · delete · add · remove · view · edit · list · play
**Moderation:** ban, unban, kick, clear, timeout, untimeout, `/mute` text|voice, `/unmute` text|voice, prison, unprison, lock, unlock, modlist, setnickname, role add|remove, rar, `/warn` add|remove|list
**Tickets:** `/ticket` create · close · delete · reopen · add_user · remove_user · claim · unclaim · rename · points list · points reset_user · notify
**Giveaways & social:** `/giveaway` start · reroll · end · cancel, quote-tweet
**Levels & economy:** reset, setxp, setlevel, id, top, streak, topstreak, profile, golds, rep, daily, setaboutme
**Utility:** addemojis, addstickers, vote, ping, debug, server, avatar, banner, colors, color, create_invite

## Notes
- **Ticket staff:** anyone with *Manage Channels* is staff; set `TICKET_STAFF_ROLE_ID` to also give a role access to ticket channels. Staff earn a point when a ticket they claimed is closed.
- **Mute/Prison:** the bot creates `Muted`, `Prisoner` roles and a `prison` channel the first time they are used. Punishments with a duration expire automatically and are re-applied if the member leaves and rejoins.
- **Levels:** 15–25 XP per minute of chatting; level = floor(sqrt(xp / 100)).
- **/vote** uses the top.gg API (`TOPGG_TOKEN`); without it the command just shows the vote link.
- **/color** uses roles named `🎨 <Color>` (reused between members).
