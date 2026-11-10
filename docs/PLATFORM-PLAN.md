# Platform plan: Kachuful becomes Baithak

**Status:** final, for approval · **Date:** 2026-11-09 · **Working doc:** delete when the work ships, never commit.

Both game plans ([KAALI-TEERI-PLAN.md](KAALI-TEERI-PLAN.md), [ISHAARA-PLAN.md](ISHAARA-PLAN.md)) build on this, so this
goes first, whichever game we start with.

## 0. Build status (2026-11-10)

Done on `baithak` (both repos): P0, P1a, P1 (paths, `src/platform/catalog.ts`), P2 (one HTML page per game with its
preview tags, Baithak manifest with shortcuts), P3, P4 (landing page), P5 (All games in both games, transition), P6
in part (shared session `src/sync/session.ts` and theme sync at the site level; the account pages still live in
Kachuful's shell, reached with `/kachuful?open=account`), P8, and Kaali Teeri in full.

Done on `ishaara` (both repos, branched from `baithak`): **Ishaara in full**, live in the catalog behind sign-in, and
§8 item 5 for it (player-wide queries, unused-player delete, counters and merge count Ishaara seats; prune-empty takes
only finished Ishaara games). Ishaara links to sign-in at `/kachuful?open=signin`, as the landing page does.

Open: P7 (theme-aware tile art beyond the landing tiles, Kachuful OG redraw), P9 (bundle budgets: landing 152 KB and
Kachuful phone 158 KB are over 145; the shared chunk holds Kachuful's store next to `persistence.ts` and the API
client), P10 (renames). nginx needs `location / { try_files $uri $uri/index.html
/index.html; }` before the deploy, and README → Hosting has the optional block for Ishaara's live events.

## 1. Goal

play.vectanix.com becomes **Baithak**, a home for table games: a landing page listing the games, Kachuful at
`/kachuful`, and room for Kaali Teeri (`/kaali-teeri`) and Ishaara (`/ishaara`). Nothing a Kachuful player has today is
lost: saved games, history, sign-in, installed app, theme, live links and recap links all keep working.

## 2. Decisions taken (from the review of the Claude Design kit)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                    | Why                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **One installable app** (one manifest, `id: '/'`, scope `/`), not one PWA per game. Each game is a path and a manifest shortcut.                                                                                                                                                                                                                            | Existing installs keep their identity (`id` is pinned to `/`); one service worker, one sign-in, one update gate.                                                                        |
| D2  | **Paths, not a router library.** A small hand-written switch on the first path segment (`/`, `/kachuful`, `/kaali-teeri`, `/ishaara`).                                                                                                                                                                                                                      | CLAUDE.md: no router. We need one level of paths; everything inside a game stays on `state.nav`.                                                                                        |
| D3  | **Per-game link previews by Vite multi-page HTML.** `index.html`, `kachuful/index.html`, `kaali-teeri/index.html`, `ishaara/index.html`, each with its own title, description, `og:image`, `apple-touch-icon`; all load the same entry script.                                                                                                              | Preview bots (WhatsApp, iMessage, Slack) don't run JS, so meta must be in the HTML the server sends for that path. This is the standard static-site answer; no server rendering needed. |
| D4  | **Kachuful's saved data is untouched.** Every `kachuful.*` and `kf.*` key and the IndexedDB stores keep their names and shapes. New platform keys use `baithak.*`; new games their own prefix.                                                                                                                                                              | CLAUDE.md: saved data is sacred.                                                                                                                                                        |
| D5  | **Kachuful moves into `src/games/kachuful/`** (your call), like every other game. Shared code stays at the top of `src/`. Done first (P1a) as a pure move with no behaviour change, so every later diff is small. See §5.0.                                                                                                                                 | One structure for every game; the move is mechanical and the existing tests prove it.                                                                                                   |
| D6  | **Backend names become neutral** (your call): cookie `kf_session` → `session`, CSRF header `X-Kachuful` → `X-Requested-With: fetch`, NOTIFY channel `kachuful_live` → `live`, plus titles and package names. **Clean switch, no transition code:** everyone signs in once more after the deploy (your call: it's an invite-only group of friends). See §12. | Neutral names survive the next rename too; no compatibility code to remove later.                                                                                                       |
| D7  | **Tokens from the kit are translated, not pasted.** Only the NEW tokens (game accents, teams, badges, motion) come in, renamed to our scheme, in `themes.css` / `themes/<id>.css`. Fonts stay as each theme has them today (the kit guessed them wrong).                                                                                                    | DESIGN-SYSTEM.md: `themes.css` is the only colour file; see the mismatch table in §6.                                                                                                   |
| D8  | **`favicon.ico`** (16 + 32 inside one file) is generated from the kit's PNGs and served at `/favicon.ico`.                                                                                                                                                                                                                                                  | Some crawlers and old browsers ask for it regardless of `<link>` tags.                                                                                                                  |
| D9  | **Card-game art follows the theme.** Under Emerald Gilt every card game shows the real deck art (card back, court cards) through the same tokens Kachuful uses; other themes draw cards flat. Landing tile art is drawn from tokens, so it changes with the theme too. See §7.                                                                              | Your call on point 3.                                                                                                                                                                   |

## 3. Open items

| #   | Item                                                                              | State                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Claude Design screens**                                                         | **Done:** round 2 in `references/design-round2/` (128 screens, tokens, tile art per theme, Emerald stand-ins). Build corrections: Kaali Teeri card says 4–10 players; Ishaara tile art not clipped; resume line shortened so it doesn't wrap to a third line; account menu shows email + player photo (email/password sign-in, no Google); round-2 `tokens.css` is the token source (§5.5 mapping still applies). |
| 2   | **Name "Baithak"** final?                                                         | Open. The wordmark, lockups and OG images carry it; the mark, icons and code names don't (§12 uses neutral names).                                                                                                                                                                                                                                                                                                |
| 3   | **Emerald Gilt art** covers "this app and this public repository only", six cards | **Decided:** build with **stand-in faces** for every card we have no art for (the 3♠, aces, queens, jacks, number cards), drawn by us in the Emerald style (ivory face, gold rule, Cinzel rank, suit pip): our own drawing, not a copy of the deck's illustrations. You add the real images later; each replaces its stand-in by dropping a file in `src/assets/themes/emerald-gilt/` and adding one token (§7).  |
| 4   | **nginx** fallback for game paths                                                 | You'll change it on the VPS: `try_files $uri $uri/index.html /index.html` (§5.3). I'll put the exact block in `backend-requests.md`.                                                                                                                                                                                                                                                                              |
| 5   | **Backend docs**                                                                  | **Done (2026-11-09):** both CLAUDE.md files now say `backend-requests.md` is the only handoff file; once it exists the backend is built in the same task; when the feature is done in both repos the working docs are deleted. Backend README and a test comment no longer point at the deleted docs.                                                                                                             |
| 6   | **Game rules**                                                                    | **Done:** both game plans' §2 are final (2026-11-09).                                                                                                                                                                                                                                                                                                                                                             |

## 4. Phases

Percentages are of this platform plan only.

| Phase | What                                                                                                                             | Size | Needs                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| P0    | Import the kit into the repo (assets only), delete the stray root `tokens.css`                                                   | S    | —                                         |
| P1a   | **Move Kachuful into `src/games/kachuful/`** (§5.0): pure move, no behaviour change                                              | M    | —                                         |
| P1    | Path routing + game registry; Kachuful served at `/kachuful`, `/` temporarily redirects there                                    | M    | —                                         |
| P2    | Brand: icons, manifest, multi-page HTML with per-game meta, `favicon.ico`, service worker                                        | M    | nginx change (§3.4)                       |
| P3    | Tokens: new tokens in all 4 themes, contrast tests                                                                               | S    | —                                         |
| P4    | Landing page (phone + desk), resume cards, coming-soon, offline, signed in/out                                                   | L    | round-2 screens                           |
| P5    | Moving between platform and a game: "All games" in Kachuful's menu and desk rail; the card-grows transition (round 2 storyboard) | M    | round-2 screens                           |
| P6    | Account and theme become platform-level; Kachuful's hub pages stay Kachuful's                                                    | M    | —                                         |
| P7    | Art: theme-aware tile art, Kachuful OG/tile redone in green felt, shared card-art module                                         | M    | permission (§3.3) for new games only      |
| P8    | Backend: `kind` on games, kind-filtered existing endpoints, preview text per game                                                | M    | backend-requests.md                       |
| P9    | Docs, e2e, bundle budgets, Lighthouse, release                                                                                   | M    | —                                         |
| P10   | Renames (§12): neutral cookie/header with transition, backend names, package names; then repos and folders                       | M    | you rename the GitHub repos and VPS paths |

Order: P0 → P1a → P1 → P2 → P3 → P8 + P10 (backend) → P7 → P4 → P5 → P6 → P9 → P10 (repos and folders, last).
The round-2 screens are in, so nothing waits on design.

## 5. Frontend design

### 5.0 Structure after the move (P1a)

```
src/
  main.tsx, App.tsx            platform entry
  platform/                    registry, routing, landing page, platform shell, account pages, brand mark
  games/
    kachuful/                  domain/, state/ (reducer, store, types, migrations, undo), screens/, sheets/,
                               strings/, sync/ (engine, Kachuful endpoints), index.tsx (lazy root)
    kaali-teeri/               same layout
    ishaara/                   same layout
  components/ui/               shared primitives (unchanged path)
  components/                  shared app pieces (AppShell, UpdateGate, ServiceWorkerHost, Avatar, PhotoPicker…)
  hooks/ lib/ theme/ styles/ assets/   shared (unchanged paths)
  state/                       shared only: persistence.ts (sole localStorage access), archive.ts (sole IndexedDB
                               access), registry.ts (players), prefs, theme store
  sync/                        shared only: api.ts (sole fetch), session, live (SSE), useRemote
  strings/                     shared strings (common, accounts, admin); each game has its own strings/
```

How the move is done, so it's safe:

- One commit, `refactor: move Kachuful into src/games/kachuful`, only `git mv` and import rewrites (a script,
  `@/domain/x` → `@/games/kachuful/domain/x`), so `git log --follow` keeps history.
- Files split by what they are, not by where they sit today: `src/domain` (29 files) is all Kachuful; `src/state`,
  `src/sync`, `src/strings` are split shared/Kachuful file by file; `src/screens` and `src/sheets` are Kachuful
  except the account/admin/credits pages, which go to `platform/`.
- The rules in CLAUDE.md that name paths ("only `persistence.ts` touches `localStorage`" and the reuse table) keep
  working because those files stay shared; the table gets the new paths.
- Proof of no change: `typecheck`, `lint`, all unit tests, the full e2e suite and the bundle report give the same
  results before and after (bundle within a few bytes; chunk names may change).
- `tools/mock-api`, `contract/fixtures` export, `e2e/` and `tools/screens` imports updated in the same commit.
- ARCHITECTURE.md and CLAUDE.md updated in a following `docs:` commit.

### 5.1 Game registry — `src/platform/games.ts`

One list, read by the landing page, the router, the manifest shortcuts and the HTML generator:

```ts
interface GameEntry {
  id: 'kachuful' | 'kaali-teeri' | 'ishaara';
  path: `/${string}`; // '/kachuful'
  name: string; // from src/strings
  pitch: string; // one line for the card
  players: string; // '3–14 players'
  status: 'live' | 'soon';
  signedInOnly: boolean; // Ishaara: true
  load: () => Promise<{ default: ComponentType }>; // the game's lazy root
  peek: () => Resume | null; // synchronous, reads only its own storage key via persistence.ts
}
```

`peek()` lets the landing page show "Resume · Round 8 · Meera leads" without downloading the game's chunk. Kachuful's
`peek` reads `kachuful.v1` through `persistence.ts` (still the only `localStorage` caller) and derives the line with a
tiny function that doesn't import the whole domain (check the bundle).

### 5.2 Routing — `src/platform/route.ts`, `PlatformRoot.tsx`

- `gameFromPath(location.pathname)` → `GameId | null`. Trailing slash and case tolerated; unknown path → landing
  with no error (and `replaceState` to `/`).
- `go(gameId | null)` does `history.pushState` and sets platform state; `popstate` switches back. Kachuful's
  `useHistorySync` pushes entries with `{ kf: n }` state and the same URL; it keeps working because it never changes
  the path. The platform listener ignores pops whose state carries `kf`.
- `App.tsx` becomes: `LazyMotion` / `MotionConfig` → `PlatformProvider` (theme, account, online state) → either
  `<Landing/>` or the game's lazy root inside `Suspense` with the existing `Loader`.
- **Kachuful's `AppProvider` mounts only under `/kachuful`.** The landing page must not pull in Kachuful's store, sync
  engine or archive (bundle budget, §5.6).
- **Old links keep working:** `/?live=`, `/?recap=`, `/?invite=`, `/?reset=` on `/` are rewritten at boot
  (`src/lib/entry.ts`) to `/kachuful?…` for live/recap, and handled at platform level for invite/reset (accounts
  are platform-wide). The backend's `/l/` and `/r/` pages redirect to `/?live=` today and keep working without a
  backend change; P8 points new games' links at their own path.
- **Installed app start:** `start_url` stays `/`. Opening the installed app lands on the landing page, unless a game
  is in progress on this device, in which case the landing page shows its resume card first. (Auto-jumping into the
  last game is an option; I'd rather not, since the landing page is one tap away from it.)

### 5.3 HTML, meta and hosting

- `vite.config.ts` `build.rollupOptions.input` → four HTML files. A small plugin generates the three game HTML files
  from `index.html` and the registry (title, description, `og:*`, `twitter:card`, `apple-touch-icon`,
  `apple-mobile-web-app-title`), so there's one template, not four copies. The theme-boot, theme-css-boot and
  preload-shell plugins run for every page.
- `og:url` and `og:image` are absolute (`https://play.vectanix.com/…`); `og:image:width/height` set.
- Service worker: `navigateFallback: 'index.html'` stays for offline; add the three game HTML files to the precache
  and a `navigateFallbackAllowlist`-style rule so `/kachuful` offline serves `kachuful/index.html` (the app routes
  by path anyway, so even the root HTML works offline; the per-game files matter only for crawlers).
- nginx: `location / { try_files $uri $uri/index.html /index.html; }` so `/kachuful` (no slash) serves
  `kachuful/index.html`. `/api`, `/r`, `/l` proxying is unchanged.
- **Check:** `curl -A WhatsApp https://play.vectanix.com/kachuful | grep og:image` in the release checklist, and an e2e
  that reads each built HTML file's meta.

### 5.4 Brand assets

- Kit files go to `public/` with stable names (`favicon.svg`, `favicon-16.png`, `favicon-32.png`, `favicon.ico`,
  `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `og-image.png`) and
  `public/games/<id>/…`. The old `icon.svg`, `pwa-*.png` stay one release (installed apps may still reference them),
  then go.
- The kit's sources (SVG + README) go to `design/brand/` (versioned, not shipped). `tools/make-icons.mjs` already
  exists: extend it to regenerate the PNGs and the `.ico` from the SVGs so nobody hand-exports again.
- Manifest: `name: 'Baithak'`, `short_name: 'Baithak'`, new description, `id: '/'` kept, icons as the kit's README,
  `shortcuts` for each live game (name, url, 96px icon). `theme_color`/`background_color` from the splash colour.
- The in-app wordmark is the kit's outlined SVG inlined as a component (`currentColor` / token fills), so no
  font loads for it.
- Kachuful's own "Kachuful" wordmark on its home screen stays; it now reads as the game's title.

### 5.5 Tokens (P3)

From `design/brand/ (kit imported)`, only the NEW tokens, renamed to our scheme and added to all four themes at once:

| Kit token                                                        | Ours                                                                                                  | Note                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `--game-kachuful/-kaali/-ishaara`                                | `--game-kachuful`, `--game-kaali-teeri`, `--game-ishaara`                                             | accent per game card                                                                  |
| `--team-sun`, `--team-sun-ink`, `--team-moon`, `--team-moon-ink` | same                                                                                                  | Ishaara; kit sets sun the same in all themes, keep per theme so contrast can be tuned |
| `--card-word*`, `--card-blank*`, `--card-trap*`, `--card-edge`   | `--word-card*`, `--word-blank*`, `--word-trap*`, `--word-edge`                                        | Ishaara cards; `--card-*` is taken by playing cards                                   |
| `--side-bid`, `--side-bid-ink`                                   | `--kt-bid`, `--kt-bid-ink`                                                                            | Kaali Teeri bidding team                                                              |
| `--badge-soon-*`                                                 | `--soon-bg/-ink/-edge`                                                                                |                                                                                       |
| `--status-offline-*`, `--status-live`                            | check against existing `--warning` / `--success` first; add only if they don't fit                    |                                                                                       |
| `--motion-*`                                                     | not tokens: `components/ui/motion.ts` already has `EASE`, springs; add `ENTER`/`EXIT` durations there | motion lives in TS today                                                              |
| `--brand-seat*`, `--brand-table`                                 | used only by the inlined mark; fills from tokens                                                      |                                                                                       |

Not taken: `--color-*`, `--font-*`, radii, `--tap-min` (we use 44px minimum, 48px hit area already), the kit's
component classes (`.card`, `.btn`, `.chip`…): our materials already cover them.

Fonts: unchanged per theme (Sunset: Instrument Sans throughout; Emerald: Cinzel display/labels; Yerba: Bricolage +
Space Mono; Paper: Instrument Serif + DM Mono). No IBM Plex Mono.

`contrast.test.ts` gets the new text pairs (soon badge, team inks on team colours, word inks).

### 5.6 Landing page (P4)

Built to the round-2 screens (`references/design-round2/png/landing-*`). What it must do:

- One card per registry entry: tile art (§7), name, pitch, players, and one of: **Play** / **Resume** (with
  `peek()` line and "saved 3 min ago") / **Coming soon** (badge, desaturated art, not a button; focusable text only)
  / **Sign in to play** (Ishaara signed out).
- Several games in progress: each card shows its own resume line; no global "resume" button.
- Header: Baithak mark + wordmark, offline status chip (reuses `SyncDot` logic), account chip / Sign in, menu
  (theme for admins, credits, about).
- States: first visit, in progress, offline, signed in, signed out, 3 games and 6 (grid reflows), loading (the
  registry is static so only a game's chunk can be "loading": the existing `Loader` while it downloads),
  error (a game chunk fails to load offline because it was never cached: message + Retry).
- Desk (≥ `MQ.big`): its own layout from the mockup, not a stretched phone page.
- Accessibility: each card is one link (`<a href="/kachuful">` so long-press/new tab work) with the Resume as a second
  control only when present; heading order; focus moves to the game's main heading after navigation.
- Bundle: the landing page's first load (HTML + JS + CSS) under today's Kachuful home budget; `tools/budget.json`
  gets a `landing` entry. Game chunks prefetch at idle after first paint.

### 5.7 Moving between games (P5)

- Kachuful phone: a "All games" row at the top of the menu sheet (02 screenshot) and the Baithak mark as the
  header's home affordance on Kachuful's home screen only (not mid-round, where a mis-tap costs a game state; the
  game is saved anyway, but don't invite it).
- Kachuful desk: the rail gets the Baithak mark above "Home" (replacing the gold K) linking to `/`.
- Transition from the mockup; transform + opacity only; reduced-motion = 120ms cross-fade. View Transitions API if
  the mockup's motion is a shared-element morph (we already use it for theme switching), else Framer Motion.
- Leaving a game mid-round is safe (it's saved on every change); the wake lock is released when the game unmounts.

### 5.8 Platform-level account and theme (P6)

- Sign in, invites, password reset, account page, theme sync (`ThemeSync`), update gate and service worker host move
  above the game switch, so they work on the landing page. Their storage keys don't change.
- Kachuful's sync engine still only runs inside Kachuful (it syncs Kachuful games). Each game owns its sync. A small
  shared `sync/session.ts` holds who's signed in.
- Hub pages (Leaderboard, History, Players, Awards) stay inside each game: stats are per game. **Players** (the
  registry) is shared: the same Riya plays Kachuful and Kaali Teeri. A platform-level "Players" page is a later idea,
  not in this plan.
- **One person, every game** (decided 2026-11-09). The players registry (local `players` store, `registry.ts`; server
  `players` table, aliases, photos, accounts, merges, claims) is the same for every game. Rahil added in Kachuful is
  offered in Kaali Teeri and Ishaara with the same name, photo and email, and a merge or alias applies everywhere.
  Each game stores only `playerId` in its seats. Stats and leaderboards stay per game.
- **Setup's suggestions ("your circle") count every game.** Today `circle()` (`registry.ts`) reads only Kachuful's
  archived games, and the server half (`met`, built by `sync/engine.ts` `pullMet` from `GET /api/players/{id}/games`)
  only Kachuful's. Change: `circle()` reads every game's archive store, and each game's sync adds its co-players to
  `met` from its own player-games route (`/api/kaali-teeri/players/{id}/games`, `/api/ishaara/players/{id}/games`).
  No new backend route is needed. The suggested-names list (`kachuful.recentNames`) stays Kachuful's key but is read
  by every game's seating (it only holds names).

## 6. Kit corrections (for the record)

|               | Kit                                      | App                           |
| ------------- | ---------------------------------------- | ----------------------------- |
| Theme switch  | `.theme-sunset` class                    | `data-theme="sunset-glass"`   |
| Token names   | `--color-bg`, `--color-text`, `--cta-bg` | `--bg`, `--text-1`, `--brand` |
| Sunset fonts  | Bricolage display                        | Instrument Sans everywhere    |
| Emerald fonts | Bricolage display, Cinzel labels         | Cinzel display and labels     |
| Yerba body    | Instrument Sans                          | Bricolage                     |
| Paper mono    | IBM Plex Mono                            | DM Mono                       |
| Min target    | 48px                                     | 44px min, 48px hit area       |

## 7. Art (P7) — your point 3

- **Kachuful's identity is green felt and gold** (its icon). Its landing tile art and OG image get redrawn on green
  felt with the gold spade, matching the icon, instead of the Sunset pink table. I'll redraw these SVGs in-repo from
  the kit's sources (they're simple vector shapes), then regenerate the PNGs.
- **Tile art is theme-aware.** Each game's tile is an inline SVG component painted from tokens (`--felt*`, `--gold`,
  `--card-bg`…), so under Yerba Sun it's the tomato table with ink outlines, under Paper the green table with a double
  rule, and under **Emerald Gilt it shows the real deck art** (the back and a court card) through the existing
  `--art-back` / `--art-trump-*` tokens and `.card-art` class. No component knows which theme has art (same rule as
  DESIGN-SYSTEM.md).
- **Shared card-art module.** The deck-art tokens, `src/theme/art.ts` preloading and `TrumpMark` / `.card-art` move
  from "Kachuful's" to "any card game's": a `PlayingCard` component (`rank`, `suit`, `face: 'up' | 'down'`, size)
  that draws the real art when the theme has it for that card, else the theme's flat face. Rule kept: a card with no
  art keeps its own rank and suit, never another card's art. Kaali Teeri uses it for the trump, called cards, the 3♠
  and the deal animation.
- **Emerald stand-ins.** Under Emerald Gilt, a card with no photo art gets a stand-in face we draw ourselves (SVG):
  ivory face, gold double rule, Cinzel rank, the suit pip; the 3♠ gets a larger centre pip and a gold frame so it
  reads as the special card. One token per card (`--art-card-<rank>-<suit>`), `none` until a real file exists;
  `PlayingCard` uses the real file when its token is set, else the stand-in. Adding your image later = one file in
  `src/assets/themes/emerald-gilt/` + one token line. The stand-ins are ours, so they could also appear in share
  images; the real deck art still never does.
- **OG images and icons never use the deck art** (licence). The kit's OG images and icons already don't.

## 8. Backend (P8) — goes into `backend-requests.md` when we start

1. **`games.kind`** `text not null default 'kachuful'`, check `kind in ('kachuful','kaali-teeri','ishaara')`, index
   `(kind, updated_at)`. One schema migration; no data migration (every existing row is Kachuful).
2. **Every existing endpoint filters `kind = 'kachuful'`**: `GET /api/games`, bootstrap's `myGames`, boards, player
   stats/games/calendar, h2h, achievements, awards, seasons, Wrapped, claims, links, public live/recap. Behaviour for
   today's app is identical (all rows are Kachuful). This keeps an old Kachuful client from ever receiving a
   payload it can't parse.
3. **Preview pages per kind:** `/l/{token}` and `/r/{token}` use the game's name and redirect to its path
   (`/kachuful?live=…`, `/kaali-teeri?live=…`). For Kachuful rows the redirect target can stay `/?live=` (the app
   rewrites it), so this is only needed once a new game has links.
4. **Site name** in preview pages and the recap OG footer: "Baithak" instead of "Kachuful" (kept per game in the
   title: "Kachuful recap").
5. **Player-wide code must count every game** (one person, every game: §5.8). Found in the backend today, each
   reading only Kachuful's tables, so each must take every game kind once a second game exists:
   - `players_repository.delete_unused_created_by` (`app/repositories/players.py:281`): "unused" checks only
     `game_players`, so deleting a user's data would **delete players who have only played Kaali Teeri or Ishaara**.
     Must also check `kt_game_players` and `ishaara_roles`.
   - `players.games_count` / `last_played_at` refresh (`app/repositories/derived.py:66`): counts only `game_players`.
   - `games_repository.ids_with_player` (`app/repositories/games.py:225`) and the admin **merge**
     (`app/services/merge.py`): must rewrite seats in every kind's payload and derived tables, so a merge applies
     everywhere.
   - `empty_ids` (`round_count == 0`): each kind sets `round_count` (hands for Kaali Teeri, revealed words for Ishaara).
   - Seat claims, aliases, photos and invites are already game-agnostic.
     Done in each game's backend phase (K7 / I2), with a test per item: a player who has played only the new game survives
     a data delete, is counted, and is merged.
6. The renames in §12 (cookie, header, channel, titles): one clean switch.
7. Each new game adds its own routes and tables; see the game plans. The shared parts they use: players registry,
   accounts, sessions, claims, share links, live hub, rate limits.

Cost note: every backend change ships to production on push (no staging). Each migration needs a working
`downgrade()`; P8 item 1 is reversible by dropping the column.

## 9. Testing

- Unit: `gameFromPath`, entry rewrites of old query links, each `peek()` against saved fixtures (including a
  prototype-shape save), registry ↔ manifest ↔ HTML agree.
- e2e (new `platform.spec.ts`): landing → Kachuful → back (button and system Back); deep link `/kachuful` cold;
  `/?live=` and `/?recap=` still open; offline cold start on `/kachuful`; coming-soon not activatable; resume card
  appears after a seeded game; theme carries across; axe on the landing page in all 4 themes; 44px targets.
- Existing suites: all Kachuful e2e specs start from `/kachuful` (one helper change, `page.goto('/')` →
  `goto('/kachuful')`), and must pass unchanged otherwise. That's the proof nothing regressed.
- Build check: each HTML file's meta (title, og:image, apple-touch-icon) per game.
- Bundle: landing budget; Kachuful's first load must not grow by more than the router (~1 KB).

## 10. Risks

| Risk                                                                                | Mitigation                                                                                                                                          |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing installed PWAs open `/` and find a landing page instead of their game      | Resume card first; one tap. Manifest `id` unchanged so the install isn't duplicated.                                                                |
| Cached old service worker serves old `index.html` for `/kachuful` before the update | The update gate already forces the new version; `/kachuful` with the old SW falls back to old `index.html`, which shows Kachuful at any path. Safe. |
| Crawlers cached the old Kachuful preview for `/`                                    | Expected; WhatsApp refreshes after some days.                                                                                                       |
| Landing pulls Kachuful's store into its chunk                                       | Bundle budget fails the build.                                                                                                                      |
| Deck-art permission doesn't extend                                                  | New games fall back to flat faces; only Kachuful keeps art. One token switch.                                                                       |

## 11. Done means

Landing page live at `/` in all 4 themes and both shells; Kachuful at `/kachuful` inside `src/games/kachuful` with
every existing e2e green; old links working; previews correct per path; icons and manifest new; backend `kind` live;
neutral cookie and header live (everyone signed in again); repos renamed; docs (README, CLAUDE.md, ARCHITECTURE.md,
DESIGN-SYSTEM.md) updated; this file and `backend-requests.md` deleted. (Claude Design prompts, round-1 screenshots and the brand kit
source were removed 2026-11-09; the kit lives in `public/` and `design/brand/`.) **`references/` (round-2 design screens,
rules files) is deleted once both Kaali Teeri and Ishaara have shipped.**

## 12. Renames (P10)

Rule: rename what's **cheap or visible**; keep what's **stored on people's devices** (CLAUDE.md: saved data is sacred).

### 12.1 Backend: changed in one clean switch

No compatibility code: the server knows only the new names from the deploy on. Everyone signs in once more (your
call, 2026-11-09: invite-only group of friends).

| Today                                                                                                                                       | New                                                                                      | What happens on deploy                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cookie `kf_session`                                                                                                                         | `session` (same attributes: HttpOnly, Secure outside local/test, SameSite=Lax, 180 days) | The old cookie is ignored: everyone is signed out and signs in again. Old rows in `sessions` are deleted in the same migration (they can't be used any more).                                                      |
| CSRF header `X-Kachuful: 1`                                                                                                                 | `X-Requested-With: fetch`                                                                | Backend and app deploy together. A tab still on the old app version gets `403 csrf` on its next write until the update gate reloads it (it checks on return to the app and hourly). Signed-out play is unaffected. |
| NOTIFY channel `kachuful_live`                                                                                                              | `live`                                                                                   | Nothing: all workers restart together.                                                                                                                                                                             |
| FastAPI title "Kachuful API", `application_name` "kachuful-api", backup prefix `kachuful-`, pyproject `kachuful-api`, password timing dummy | "Baithak API", `baithak-api`, `baithak-`, `baithak-api`                                  | Rename the existing backup files on the VPS once (`kachuful-*.dump` → `baithak-*.dump`) so the prune job keeps rotating them; the exact command goes in `backend-requests.md`.                                     |
| Preview pages / recap OG text "Kachuful"                                                                                                    | per game + "Baithak"                                                                     | §8.                                                                                                                                                                                                                |

Deploy order: backend and frontend in the same window, then tell the group to sign in again.

### 12.2 Backend ops: optional, on the VPS, done by you (I write the exact steps in `backend-requests.md`)

| Today                                      | New                              | Note                                                                                                                                                              |
| ------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB `kachuful`, role `kachuful`             | `baithak`                        | `ALTER DATABASE … RENAME` needs no open connections (stop the API for a minute); with SCRAM passwords the role rename keeps its password. `DATABASE_URL` changes. |
| `/srv/kachuful/…`, systemd `kachuful-api@` | `/srv/baithak/…`, `baithak-api@` | Deploy workflow (`deploy.yml`) and sudoers line change together.                                                                                                  |
| CI service DB `kachuful_test`              | `baithak_test`                   | `ci.yml`; only CI, no data.                                                                                                                                       |

If you'd rather not touch the VPS, skip 12.2: nobody sees these names.

### 12.3 Frontend: changed

| Today                                                 | New                                              |
| ----------------------------------------------------- | ------------------------------------------------ |
| `package.json` name `kachuful`                        | `baithak`                                        |
| Manifest name, page titles, Apple title               | "Baithak" (game pages: "Kachuful · Baithak")     |
| `X-Kachuful` header in `sync/api.ts` and the mock API | `X-Requested-With: fetch`                        |
| README, ARCHITECTURE.md, CLAUDE.md intro              | describe the platform; Kachuful becomes one game |

### 12.4 Frontend: kept on purpose

| Name                                                   | Why it stays                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `localStorage` keys `kachuful.*`, `kf.theme*`          | Saved data on every device; renaming needs a migration for no visible gain. They're Kachuful's keys and Kachuful still exists. |
| IndexedDB database name                                | Same: renaming means copying every archived game.                                                                              |
| Service worker caches `kachuful-fonts`, `kachuful-art` | Renaming only makes every device re-download fonts and art once. Can be renamed later with cleanup if you want.                |

### 12.5 Repos and folders (last, after everything is merged)

| Today                                                                                    | Suggested                    |
| ---------------------------------------------------------------------------------------- | ---------------------------- |
| GitHub `jaydhakan/web-kachuful-scorekeeper`                                              | `jaydhakan/baithak-web`      |
| GitHub `jaydhakan/backend-kachuful-scorekeeper`                                          | `jaydhakan/baithak-api`      |
| Local folders `~/projects/PR/web-kachuful-scorekeeper`, `…/backend-kachuful-scorekeeper` | `baithak-web`, `baithak-api` |

What the rename touches:

- **GitHub** (you, in Settings → Rename, or I run `gh repo rename` when you say so): old URLs, clones and the
  deploy workflow keep working through GitHub's redirect, but update remotes anyway:
  `git remote set-url origin git@github.com-PR:jaydhakan/baithak-web.git` (and the API's).
- **Secrets / deploy keys** are per repo and survive a rename. The VPS's checkout (if it pulls by URL) should get the
  new URL.
- **Paths that name the sibling folder**, updated in the same change as the folder rename: frontend `CLAUDE.md`,
  `README.md`, `docs/codebase/ARCHITECTURE.md`, `e2e/backend.ts`, `tools/screens/screens.spec.ts`; backend
  `CLAUDE.md`.
- **Claude Code's memory for this project is stored by folder path**
  (`~/.claude-personal/projects/-home-jay-projects-PR-web-kachuful-scorekeeper/`). After renaming the folder, copy
  that directory to the new path's name, or the saved preferences (no co-author trailer, progress %, plan first) are
  not loaded.
- **Do it between tasks:** no open branches, both working trees clean.
