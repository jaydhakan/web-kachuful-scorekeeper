# Prompt for Claude Design

Attach the 20 screenshots from the `design-screenshots/` folder with this prompt.

---

## What exists today

The 20 attached screenshots show **Kachuful**, a mobile-first scorekeeper for the Indian card game Judgement / Kachuful. Friends at a real card table use it on one phone: it seats the players, deals out each round, takes bids, enforces the dealer's rule and keeps score. It works offline, installs as a PWA, and can sign in to sync games and show a global leaderboard.

- **Screens shown:** home (01, 11), menu (02), 3-step game setup (03–05), a round: bidding, playing, results and summary (06–09), winner podium (10), history, leaderboard, players and rules pages (12–15), the same bidding screen in the other three themes (16–18), and the desktop layout (19–20).
- **Four themes**, chosen per user: Sunset Glass (default, warm plum glass with gold), Emerald Gilt (card-table green and gold), Yerba Sun, and Editorial Paper (cream paper, black rules, serif). Every theme has the same layout; only paint changes. Colours, fonts and materials are design tokens (CSS custom properties); components never use raw hex.
- **Current brand:** gold "Kachuful" wordmark with suit symbols. The favicon is a gold spade on a dark green felt circle.

## What is changing

The site is moving to **play.vectanix.com** and becoming a small **home for several table games**. Kachuful will be one of them. Two more are planned, and others may follow:

1. **Kaali Teeri** ("3 of Spades"): an Indian trick-taking card game. Players bid for the right to name trump and pick partners by calling cards, so partnerships stay secret until those cards are played. The 3 of spades (kaali teeri) is worth the most points. As with Kachuful, people play with a real deck and the app keeps score: bids, called partners, points per round.
2. **A word-guessing team game** (working name to be decided): two teams, a grid of 25 word cards. Each team has one clue-giver who sees a secret key and gives one-word clues, and teammates guess which cards are theirs. One card ends the game for whoever picks it. This is an **original game in that genre**. Do not use the name, logo, card art, colours or layout of any existing commercial word game. Give it its own name suggestions and its own look.

## What I need from you

### 1. Platform brand
- A **name for the platform** that sits above the games. Working name: "Vectanix Play". Suggest 3 alternatives too, then design with the one you recommend.
- **Wordmark + logo mark.** The mark must work at 16px and must not belong to any one game (no spade alone, no Kachuful gold K). It should feel like a game night at a table, not a casino.
- **Favicon and icon set** for the platform, as SVG sources plus a size list: `favicon.svg`, 32px and 16px, 180px Apple touch icon, 192px and 512px PWA icons, and a 512px **maskable** icon with its safe zone respected.
- **Link preview image** (Open Graph, 1200×630) for the platform, shown when someone shares play.vectanix.com in WhatsApp, iMessage or Slack.

### 2. Game selection landing page (the new home)
- Mobile first (390px wide), plus desktop (1280px). Same tone as the current app: rich, tactile, with motion that's calm rather than flashy.
- **One card per game:** name, one-line pitch, player count (Kachuful 3–14; Kaali Teeri 4 or more; word game 4+ in two teams), "Resume" when a game is in progress on this device, and a "Coming soon" state for games not built yet.
- **Sign in / account** reachable from here (one account across all games).
- States: first visit, a game in progress (one or several games mid-game), offline, signed in vs signed out.
- Room to grow: show it with 3 games and with 6.

### 3. Each game's identity inside the platform
- **Key art / tile art and an icon** for each of the three games, in a family that clearly belongs together.
- Kachuful keeps its current identity; just fit it into the family.
- A **link preview image** (1200×630) and an **app icon** for each game, for when someone shares a link straight to a game (e.g. play.vectanix.com/kachuful).

### 4. Getting between the platform and a game
- How a player gets **back to all games** from inside one (the header and menu in screenshots 02 and 06, and the desktop sidebar in 19).
- The **transition** from the landing page into a game and back. Animate only transform and opacity, and give a reduced-motion version.

### 5. Theming
- Show how the **landing page looks in all four themes** (Sunset Glass, Emerald Gilt, Yerba Sun, Editorial Paper), using the same layout in each.
- If a game needs its own accent (e.g. a team red/blue for the word game), express it as **tokens** that each theme can define, not fixed colours. Team colours must be colour-blind safe and must not rely on colour alone (add shape, pattern or label).

### 6. First screens of the two new games (rough, not final)
- Kaali Teeri: setup (players, scoring options), a bidding/calling-partner round screen, the scoreboard.
- Word game: setup (teams, words), the 5×5 grid in **table mode** (one shared screen everyone sees) and the clue-giver's **key view** (a second phone), and the win screen.

## Constraints
- Phone first; one device is passed around a real table, so text must be big and readable from across it.
- Every tap target is at least 44×44px. Visible focus rings. Real buttons and labels.
- Works offline. No ads, no social feed.
- Font sizes from one type scale; colours only as named tokens.

## Output I want back
1. A **token list** for anything new (name, value per theme), matching the existing token style.
2. **SVG files** for the logo mark, wordmark, favicon, maskable icon and each game's icon, plus the 1200×630 preview images as PNG.
3. **HTML/React mockups** of the landing page (mobile and desktop, all states above, all four themes) and the game-switching pattern.
4. Rough screens for Kaali Teeri and the word game.
5. A short note on any decision I need to make (the name, which games show "Coming soon", and so on).
