# Two-Thirds (working title): Roblox Game Design Document
Status: design only, not built. Version 0.1, Nov 7 2026.

## 1. Pitch
A crowd mind game in a Squid Game-style arena. Every 30 seconds, everyone in the server picks a number from 0 to 100. Whoever is closest to two-thirds of the average wins. In elimination matches, picking wrong knocks you out. Players get a number on their back, stand together in a circle that grows or shrinks with the crowd, and every round ends with a live crowd graph made for TikTok clips.

Content rule: players can only pick numbers and press buttons. There is no chat input, no drawing, and no uploads, so there is nothing to moderate. Roblox's default chat can be turned off in arena servers.

## 2. Core rules
- Each round, every living player picks a whole number inside the current window. The window starts at 0 to 100.
- Target = multiplier x the average of all picks. The default multiplier is 2/3.
- Distance = |pick - target|. The smallest distance wins. If players tie, they all win.
- Anyone who doesn't pick before the timer ends gets assigned a random number and a "frozen" mark, so going AFK never helps you.
- If everyone picks the same number, nobody wins the round, which makes copying the crowd useless.

## 3. Modes
1. **Endless Lobby (default):** 30-second rounds that never stop. Wins build your streak, and there is no elimination. This is the casual mode that feeds leaderboards.
2. **Elimination Match:** Starts once 12 or more players have readied up. After each round, players are ranked by distance, and the farthest 50% are eliminated, with at least 1 out per round. Rounds repeat until one player is left. Eliminated players spectate from the stands.
3. **Nightly Sudden Death Finale (8 PM in the player's local server region):** An elimination match that is open to the top streak holders of the day, plus a public seating area for spectators. The winner's username and back number are featured on a lobby board until the next finale.
4. **Private Rooms (paid):** For streamers, Discord servers, and classrooms. Same rules, with a host panel to pick mode, round length, and which twists are on.

## 4. Round flow (30 seconds)
| Time | Phase | What happens |
|---|---|---|
| 0-2s | Announce | Banner shows the window (for example 0-100) and any twist. A mystery round shows "?" instead of 2/3. |
| 2-22s | Pick | Players set a number on the picker dial. Trust peeks and bluff setting happen here. Picks can change until lock. |
| 22-24s | Lock | Picks freeze. A drumroll animation plays with the circle lights. |
| 24-28s | Reveal | The crowd graph animates: a bar for each number, the average line, then the target line drops in. Winners glow, and in elimination matches the losers' floor tiles drop. |
| 28-30s | Results | Streak counters update and the next window is announced. |

## 5. Arena: the scaling circle
- Players stand in a ring on a round platform. Each player stands on a floor tile with their back number painted on it.
- Radius formula: r = 6 + 2.5 x sqrt(N) studs, where N is the number of living players. Because the area grows with N, each player always gets about the same personal space.
  - At 4 players the radius is 11 studs, at 25 it's 18.5, at 100 it's 31, and at 200 it's about 41.
- When players are eliminated, the platform smoothly shrinks to the new radius over 2 seconds (a tween), pulling survivors closer. This is the visual "the circle is closing" moment.
- Tile positions: player i of N stands at angle 2*pi*i/N around the ring. Above 40 players, the game switches to two rings, inner and outer.
- Optional "walk to pick" style, for the 0 to 10 window only: numbered zones light up on the floor, and walking onto one sets your pick.

## 6. Player numbers
- When a player joins a server, they get the lowest free number in that server, from 001 to the server size, which is up to 100 by default.
- The number is shown on their back with a SurfaceGui on the torso, on their floor tile, and on the leaderboard.
- Cosmetic only: lucky number requests are a paid item (see section 9), but numbers are never reused in the same match.

## 7. Expansions
1. **Shrinking window:** Within a session, the window narrows over time: 0-100, then 0-50, then 0-25, then 0-10. In elimination matches it narrows by one step every 3 rounds. In the Endless Lobby it narrows by one step every 10 minutes and resets every hour.
2. **Trust peek:** During the pick phase, spend a peek to see the current picks of 3 random players in the round. Everyone gets 2 free peeks per match, and the season pass adds more. If a player is bluffing, you see their fake number.
3. **Bluff mode:** Set a displayed number that is different from your real pick. Anyone who peeks at you sees the fake number. Bluffing costs 1 bluff charge, and there are 2 free per match. Your real pick decides the round.
4. **Mystery multiplier:** About 1 in 6 rounds uses a hidden multiplier, either 1/2, 3/4, or 1.0, which means pick the exact average. It's revealed only after the lock.
5. **Country and team leagues:** Each win adds 1 point to your country, read with LocalizationService:GetCountryRegionForPlayerAsync, and to your team (Red, Blue, Green or Gold, chosen once per season). There are daily and seasonal standings boards, and everything is shown only as ranked text.
6. **Live crowd graph:** A bar chart after every round, with the average and target lines. This is the main TikTok clip shot. A "Clip View" button hides the HUD for clean screen recording.
7. **Streak shield:** Win 5 rounds in a row and you earn a shield, with a maximum of 1 held at a time. It absorbs one loss so your streak survives. In elimination matches, a shield saves you once from elimination, but not in the final 4.
8. **Decoy round:** Once per match, a banner flashes "Last round's average was X", but X is actually yesterday's global average, labeled as a decoy only after the reveal. It tests herding behavior.
9. **Sped-up replay:** After each elimination match, a 10-second replay plays, showing each round's graph and the circle shrinking. It's available from the lobby's "Replays" screen.

## 8. Progression and stats
- Saved per player: current streak, best streak, total wins, matches won, finale wins, shields held, cosmetics owned, team.
- Global leaderboards: best streak today, total wins this season, finale winners.
- Season length is 4 weeks. Streak records are kept forever.

## 9. Monetization (Robux only, no cash prizes, no paid odds)
- **Cosmetics:** Number fonts and colors, back-number frames, floor tile skins, glow effects when you win, and a custom celebration emote after the reveal. All of it is premade by us.
- **Season Pass (game pass, renewed each season):** Gives +2 peeks and +2 bluff charges per match, a stats history screen, an exclusive tile skin, and a 2-digit lucky number request. It never changes who wins a round.
- **Private Rooms:** A one-time purchase, or a cheaper per-room rental for hosting reserved servers with a host panel.
- **Sponsored nights:** A brand name appears on the finale banner and a sponsor tile skin is given away for free. These go through Roblox's ad and partner rules.
- **No loot boxes and nothing random sold for Robux.** This keeps it clear of Roblox's paid random item rules and gambling concerns.

## 10. Tech (Roblox Studio and Luau)
**Server (ServerScriptService)**
- `RoundManager.server.luau` runs the state machine (Announce, Pick, Lock, Reveal, Results), the timers, and the target math, and handles elimination.
- `PickService.luau` validates picks inside the current window, stores them in a server-only table, and handles bluffs (keeping displayed and real picks separate). Peeks are served from server data, so clients never receive the real picks.
- `ArenaService.luau` computes the radius r = 6 + 2.5*sqrt(N), places tiles, tweens the shrink, and assigns back numbers.
- `DataService.luau` uses DataStoreService for each player's profile (streaks, wins, cosmetics, team). It saves with UpdateAsync when a player leaves, autosaves every 2 minutes, and saves on BindToClose.
- `LeaderboardService.luau` uses OrderedDataStore for best streak and season wins, and MemoryStoreService sorted maps for live daily boards and country and team totals.
- `GlobalSync.luau` (phase 2) uses MessagingService and MemoryStore to combine averages across servers for an optional "World Round" mode.
- `Monetization.luau` uses MarketplaceService for the game pass and developer product checks.

**Client (StarterPlayerScripts and StarterGui)**
- `PickerUI.client.luau` is the number dial with +/- buttons, the peek button, and the bluff toggle, and it shows the window and the timer.
- `CrowdGraph.client.luau` builds the reveal bar chart from Frames and tweens the average and target lines.
- `ArenaFX.client.luau` handles the tile drop, the winner glow, and the shrink animation on the client side.
- `ClipView.client.luau` hides the HUD for recording.

**Networking (ReplicatedStorage/Remotes)**
- RemoteEvents: `SubmitPick(number)`, `SetBluff(number)`, `RequestPeek()`, `RoundState(phase, data)`, `RoundResult(graphData, winners, eliminated)`.
- Anti-cheat: the server ignores out-of-window picks and picks after the lock, rate-limits remotes, and never sends real picks to clients before the reveal.

## 11. One-day prototype build order
1. **Hour 0-1:** Make a new Baseplate place. Build the circular platform and the folder layout above, add the RemoteEvents, and turn off chat input in arena servers.
2. **Hour 1-3:** Write the RoundManager state machine with 30-second rounds and the target math. Test it with 2 to 4 players using Studio's local server test.
3. **Hour 3-4:** Build the PickerUI dial and SubmitPick validation. Make sure AFK players get random picks.
4. **Hour 4-5:** Write ArenaService: back numbers, tile placement with the sqrt radius formula, and the shrink tween.
5. **Hour 5-6:** Build the CrowdGraph reveal and the winner glow.
6. **Hour 6-7:** Add Elimination Match mode (the farthest 50% are cut) and spectator stands.
7. **Hour 7-8:** Hook up DataService to save streaks to DataStore, plus an OrderedDataStore board for best streak.
8. **Hour 8-9:** Add the shrinking window, trust peek, and bluff mode.
9. **Hour 9-10:** Add mystery multiplier rounds and streak shields.
10. **Hour 10-11:** Playtest with 8 or more people, record a few reveal clips, and tune the round timing.
11. **Later, after the prototype:** Leagues, nightly finale scheduling, decoy rounds, replays, Private Rooms, cosmetics shop, Season Pass, sponsored nights, and the cross-server World Round.

## 12. Success checks for the prototype
- A full 30-second round runs with no errors for an hour straight.
- The target and winner math matches a hand calculation on 10 test rounds.
- The circle radius follows the formula as players join and get eliminated.
- Streaks survive leaving and rejoining.
- One reveal clip is clean enough to post.
