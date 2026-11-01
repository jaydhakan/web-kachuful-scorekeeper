# Inventory before the three-theme redesign

Written on 2026-11-01 at `4b3e41b`, before any redesign code changed. Every item is ticked at the end with one of
**preserved** (unchanged), **restyled** (same behaviour, new paint) or **improved** (same behaviour, more polish).
Nothing here may be removed without Jay's approval; see "Proposed removals" at the end.

Legend: `- [ ]` not yet checked · `- [x] … — restyled` checked, with the outcome.

## 1. Screens and overlays

Phone shell (`src/components/AppShell.tsx`):

- [ ] **Home, first run** — fanned suit orbit, wordmark, New game, demo game, how to play (`src/screens/Home.tsx`)
- [ ] **Home, game in progress** — Continue card with round, leader and progress (`src/components/ContinueCard.tsx`)
- [ ] **Home, with archive** — Today strip, hub links to History, Boards, Players, Awards (`src/components/TodayStrip.tsx`, `hubNav.tsx`)
- [ ] **Home, signed in** — account chip, sync dot, online hub (`src/components/HomeOnline.tsx`, `AccountChip.tsx`, `SyncDot.tsx`)
- [ ] **Setup step 1** — decks (1/2) and player count buttons, use last group (`src/screens/setup/Step1.tsx`)
- [ ] **Setup step 2** — seat names on the table, remembered-name chips, email step when signed in (`Step2.tsx`, `SamePerson.tsx`)
- [ ] **Setup step 3** — dealer, direction, game length (endless / one cycle / two cycles), random dealer (`Step3.tsx`)
- [ ] **Round start (deal)** — deal animation, card count and trump reveal, tap to skip (`src/screens/round/RoundStart.tsx`)
- [ ] **Bidding** — table with bids, bidder card, over/under meter, bid keypad, dealer restriction (`Bidding.tsx`)
- [ ] **Play** — enlarged table with bids, trick summary, Results button (`Play.tsx`)
- [ ] **Results** — made/missed per player, exact-tricks rule, auto-filled last result (`Results.tsx`)
- [ ] **Summary** — standings with round deltas and count-up, leader reorder, next round (`Summary.tsx`)
- [ ] **Winner** — podium, game stats cards, achievement reel, share, new game (`src/screens/Winner.tsx`)
- [ ] **Sheets** — Menu, Rules, Scoreboard, Edit round, Upcoming rounds, Seat (rename/avatar/remove), Share (`src/sheets/*`)
- [ ] **Confirm modal** — end game, quit to home, and other confirmations (`src/components/ConfirmModal.tsx`)
- [ ] **Repair-save modal** — offered when the saved game is corrupt (`RepairSaveModal.tsx`)
- [ ] **Toast** — one slot in the top bar, with Undo / Open actions (`src/components/ui/Toast.tsx`)
- [ ] **Banner** — offline / sync / error banner under the header (`ui/Banner.tsx`)
- [ ] **Update prompt** — "New version, Reload" and "Ready to work offline" (`UpdatePrompt.tsx`)
- [ ] **Streak celebration** — full-screen hot/cold streak bursts (`StreakCelebration.tsx`)
- [ ] **Badge pop** — small achievement cards dropping under the top bar (`BadgePop.tsx`)

Pages (`src/screens/pages/Pages.tsx`, pushed on the nav stack):

- [ ] **History** — finished games, search, date range, loading/empty/no-results (`HistoryPage.tsx`, `ui/DateRangePicker.tsx`)
- [ ] **Game page** — one finished game: standings, rounds, share (`GamePage.tsx`)
- [ ] **Boards (leaderboard)** — this month / all time / global, empty state (`BoardsPage.tsx`)
- [ ] **Player page** — stats, trumps, streaks, photo (`PlayerPage.tsx`, `PhotoPicker.tsx`)
- [ ] **Head to head** (`H2HPage.tsx`)
- [ ] **Achievements** (`AchievementsPage.tsx`)
- [ ] **Players** — registry with search (`PlayersPage.tsx`)
- [ ] **Awards** — season awards, loading and error states (`AwardsPage.tsx`)
- [ ] **Wrapped** — yearly recap cards (`WrappedPage.tsx`)
- [ ] **Activity** — signed-in feed, Show more with retry (`ActivityPage.tsx`)
- [ ] **Account** — profile, inbox, sign out (`AccountPage.tsx`, `InboxList.tsx`)
- [ ] **Admin** — users, invites, reset links, merges, overview (`AdminPage.tsx`)
- [ ] **Sign in / Invite / Reset password** (`AuthPages.tsx`)
- [ ] **Live link and recap viewers, Not found** (`ViewerPages.tsx`)
- [ ] **Import** — bring a game in from a link (`ImportPage.tsx`)

Large-screen UI (`src/screens/desk/*`, tablets and desktops):

- [ ] **Desk shell** — rail or top bar navigation, workspace panes (`DeskShell.tsx`, `Nav.tsx`, `Workspace.tsx`)
- [ ] **Desk home, setup, bid pane, play pane, results pane, summary, scoreboard, winner** (`DeskHome.tsx` … `DeskWinner.tsx`)
- [ ] **Desk drawers** — rules, upcoming, coming up, step tracker, score chart, score panel (`Drawer.tsx`, `RulesDrawer.tsx` …)

## 2. Animations and effects

- [ ] **Screen transitions** — slide + fade by nav direction, exit faster than entry (`AppShell.tsx:65`)
- [ ] **Page recede** — app scales to 0.975 under a sheet or modal (`AppShell.tsx:110`)
- [ ] **Ambient glow** — trump-tinted glow breathing behind the header (`styles/index.css` `.ambient`)
- [ ] **Grain and vignette** over every screen (`index.css` `.grain`)
- [ ] **Home suit orbit** — four suits orbiting the wordmark, frame loop (`Home.tsx:30`)
- [ ] **Home hero entrance** (`Home.tsx`)
- [ ] **Desk home floating suits** (`DeskHome.tsx:19`)
- [ ] **Seat pop-in** — seats scale in staggered 40 ms; dropped seat falls in with a spring (`ui/Table.tsx`)
- [ ] **Direction arcs flip** — table arrows mirror with a spring when direction changes (`Table.tsx` `Arcs`)
- [ ] **Dealer chip glide** — dealer token moves seat to seat with `layoutId` (`Table.tsx`)
- [ ] **First-player chip pop** (`Table.tsx`)
- [ ] **Bid badge pop** — bid number springs in and out on a seat (`Table.tsx`)
- [ ] **Made/missed chip pop** on seats (`Table.tsx`)
- [ ] **Pass arrow** — dashed arrow drawn from seat to seat (`Table.tsx` `arrowFrom`)
- [ ] **Active seat ring pulse** and **dealer warn pulse** (`index.css` `.ring-pulse`, `.warn-pulse`)
- [ ] **Random dealer spin** — token laps the table twice then settles; reduced motion skips laps (`Step3.tsx:53`)
- [ ] **Deal animation** — cards fly to seats, card count and trump reveal, skippable (`RoundStart.tsx`)
- [ ] **Bidder card slide** — old and new bidder cards cross-slide (`Bidding.tsx:78`)
- [ ] **Selected bid key** — accent fill slides between keys with `layoutId` (`Bidding.tsx:188`)
- [ ] **Over/under meter** fill (`Bidding.tsx`)
- [ ] **Summary count-up** — round deltas and totals count up, sparks on gains (`Summary.tsx`, `ui/Counter.tsx`)
- [ ] **Leader reorder** — standings rows reorder with layout animation (`Summary.tsx`)
- [ ] **Winner podium rise and confetti** — canvas confetti in avatar colours, skipped under reduced motion (`Winner.tsx`, `ui/Confetti.tsx`)
- [ ] **Achievement reel** — cards flip in one by one, tap to turn over (`AchievementReel.tsx`)
- [ ] **Streak celebration** — ember/snow particles per player, tap to advance (`StreakCelebration.tsx`)
- [ ] **Badge pop** — cards drop in under the top bar and leave (`BadgePop.tsx`)
- [ ] **Sheet slide and drag-to-dismiss** with velocity projection (`ui/Sheet.tsx:53`)
- [ ] **Modal scale-in** (`ui/Modal.tsx`)
- [ ] **Toast drop-in** into the top bar (`ui/Toast.tsx`)
- [ ] **Banner slide** (`ui/Banner.tsx`)
- [ ] **Segmented thumb slide** (`ui/Seg.tsx` `layoutId`)
- [ ] **Press feedback** — `PRESS` 0.97 / `PRESS_SM` 0.92 and `.press` / `.press-sm` (`ui/motion.ts`, `index.css`)
- [ ] **Magnetic primary button** on mouse; two-fill cross-fade when enabling (`ui/PrimaryButton.tsx`)
- [ ] **Spotlight hover** on glass cards (`index.css` `.spot`, `ui/Glass.tsx`)
- [ ] **Skeleton shimmer** and **spinner** (CSS, `index.css`)
- [ ] **Suit glow pulse** in the table centre (`index.css` `.suit-glow`, `ui/SuitCenter.tsx`)
- [ ] **Edge fades** on sideways scrollers and under the header (scroll-driven, `index.css`)
- [ ] **Avatar photo fade-in** (`ui/Avatar.tsx`)
- [ ] **Wrapped card entrances** (`WrappedPage.tsx`)
- [ ] **Stats tiles** count/appear (`ui/Stats.tsx`)
- [ ] **Desk score chart** line draw (`desk/ScoreChart.tsx`)
- [ ] **Reduced motion** — `MotionConfig reducedMotion="user"` plus per-effect fallbacks (`App.tsx`)

## 3. Sounds and haptics

- [ ] **Haptic tick** — `vibrate(10)` on bid, result and confirm taps, feature-detected (`src/hooks/useHaptics.ts`)
- [ ] **No sounds** — the app plays no audio today (checked: no `Audio`/`AudioContext` in `src`)

## 4. Interactive behaviours and gestures

- [ ] **Long-press drag to swap seats** on the setup table (`Step3.tsx:248`, `DeskSetup.tsx:327`)
- [ ] **Tap a seat** to rename, change avatar or remove (`sheets/SeatBodies.tsx`)
- [ ] **Undo** — from the toast and the menu; persisted undo stack (`state/undo.ts`)
- [ ] **Edit a past round** from the scoreboard (`sheets/EditBody.tsx`, `hooks/useRoundEdit.ts`)
- [ ] **Game length** — endless, one cycle, two cycles (`domain/types.ts:5`)
- [ ] **Decks** — one or two decks, seats up to ten (`Step1.tsx`)
- [ ] **Direction** — clockwise / anticlockwise, changes seat layout only
- [ ] **Dealer restriction** — dealer's forbidden bid is struck through and explained (`domain/bidding.ts`)
- [ ] **Exact-tricks rule** on Results and the auto-filled last result (`Results.tsx`)
- [ ] **Demo game** from Home (`domain/demo.ts`)
- [ ] **Use last group** shortcut in setup (`strings` `↺ Use last group`)
- [ ] **Remembered names** chips and recent names (`persistence.ts` `recentNames`)
- [ ] **Share** — share sheet, share image (canvas), share text, live and recap links (`sheets/ShareBody.tsx`, `lib/shareImage.ts`, `ShareLinks.tsx`)
- [ ] **Import a game** from a link (`ImportPage.tsx`)
- [ ] **Keyboard shortcuts** — digits to bid, Enter, ?, Ctrl/⌘+Z (`hooks/useShortcuts.ts`, `desk/useDeskKeys.ts`)
- [ ] **Roving focus** in groups (`hooks/useRovingFocus.ts`)
- [ ] **System Back closes the top sheet/screen** (`hooks/useHistorySync.ts`)
- [ ] **Wake lock** while a game is open (`hooks/useWakeLock.ts`)
- [ ] **Visual viewport** keeps controls above the keyboard (`hooks/useVisualViewport.ts`)
- [ ] **Deep links** — `/r/…` recap, `/l/…` live, invite and reset URLs (`lib/route.ts`, `lib/entry.ts`)
- [ ] **Sign in / out, invite, reset password, admin actions** (`src/sync/*`, `AuthPages.tsx`, `AdminPage.tsx`)
- [ ] **Sync** — background sync with status dot and banners when signed in (`src/sync/engine.ts`, `SyncDot.tsx`)
- [ ] **Player photos** — pick, crop, upload (`PhotoPicker.tsx`, `lib/photo.ts`)
- [ ] **Streaks, achievements, awards, wrapped** computed from games (`src/domain/*`)
- [ ] **Tap to skip** the deal animation and the streak celebration

## 5. Settings and persisted state

- [ ] `kachuful.v1` (current game), `kachuful.v1.backup`, `kachuful.undo`, `kachuful.screen` (`state/persistence.ts`)
- [ ] `kachuful.lastGroup` (names, emojis, colours, direction, decks), `kachuful.recentNames`
- [ ] `kachuful.device`, `kachuful.session`
- [ ] IndexedDB `kachuful` archive: games and player registry (`state/archive.ts`, `state/registry.ts`)
- [ ] Saved-game migrations and the prototype save shape (`state/migrations.ts`)

## 6. Offline and PWA

- [ ] **Installable PWA** — manifest with id, icons, standalone, portrait (`vite.config.ts`)
- [ ] **Precache** of JS, CSS, HTML, fonts; player photos cache-first (`vite.config.ts` workbox)
- [ ] **Update flow** — prompt only, checks on focus and hourly (`hooks/useServiceWorker.ts`)
- [ ] **Offline play** — signed out, everything is local; signed in, sync queues until online
- [ ] **Offline banners** and offline-safe server screens that refresh when the connection returns

## 7. UI emoji used as icons (to replace with Phosphor; avatars stay emoji)

- [ ] Menu rows 👤 🔑 📖 📊 🗓️ ↩️ 🔗 🏁 🏠 (`src/sheets/MenuBody.tsx:17`)
- [ ] Seat sheet ✏️ 🗑️ (`src/sheets/SeatBodies.tsx:15`)
- [ ] Setup and round copy 👑 👉 🃏 🎲 (`src/strings/index.tsx:120`, `:157`, `:229`, `:332`, `:519`)
- [ ] Rules section icons 🪑 🔢 🎯 🏆 (`src/strings/rules.tsx:7`)
- [ ] Winner stat cards 🏆 🎯 💥 🔥 🪝 😬 (`src/screens/Winner.tsx:174`, `:227`)
- [ ] Places line 🥇 🥈 🥉 (`src/strings/hub.tsx:121`)
- [ ] Home "How to play" 📖 (`src/screens/Home.tsx:182`)
- [ ] Desk setup ☁️ (`src/screens/desk/DeskSetup.tsx:545`)
- [ ] Kept as content, not icons: streak titles 🔥 🚀 🐐 💎 🥶 💀 🪦 🧟 and their particles (personality copy), player avatar
      animals (`src/domain/avatars.ts`), suit symbols ♠ ♦ ♣ ♥, ✓ ✗ result marks

## Proposed removals

None.
