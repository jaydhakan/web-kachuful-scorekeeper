# Inventory before the three-theme redesign

Written on 2026-11-01 at `4b3e41b`, before any redesign code changed. Every item is ticked at the end with one of
**preserved** (unchanged), **restyled** (same behaviour, new paint) or **improved** (same behaviour, more polish).
Nothing here may be removed without Jay's approval; see "Proposed removals" at the end.

Legend: `- [ ]` not yet checked · `- [x] … — restyled` checked, with the outcome. Checked on 2026-11-01 after the
redesign (commits a9f0d71..HEAD); the evidence is the unit and e2e suites, `e2e/themes.spec.ts`, and the screenshots in
`screenshots/after/<theme>/`.

## 1. Screens and overlays

Phone shell (`src/components/AppShell.tsx`):

- [x] **Home, first run** — fanned suit orbit, wordmark, New game, demo game, how to play (`src/screens/Home.tsx`) — improved: destinations as a grouped list on tall phones (tiles kept on short ones), icons
- [x] **Home, game in progress** — Continue card with round, leader and progress (`src/components/ContinueCard.tsx`) — restyled
- [x] **Home, with archive** — Today strip, hub links to History, Boards, Players, Awards (`src/components/TodayStrip.tsx`, `hubNav.tsx`) — restyled
- [x] **Home, signed in** — account chip, sync dot, online hub (`src/components/HomeOnline.tsx`, `AccountChip.tsx`, `SyncDot.tsx`) — restyled
- [x] **Setup step 1** — decks (1/2) and player count buttons, use last group (`src/screens/setup/Step1.tsx`) — restyled
- [x] **Setup step 2** — seat names on the table, remembered-name chips, email step when signed in (`Step2.tsx`, `SamePerson.tsx`) — restyled
- [x] **Setup step 3** — dealer, direction, game length (endless / one cycle / two cycles), random dealer (`Step3.tsx`) — restyled
- [x] **Round start (deal)** — deal animation, card count and trump reveal, tap to skip (`src/screens/round/RoundStart.tsx`) — improved: deal fan behind the trump card
- [x] **Bidding** — table with bids, bidder card, over/under meter, bid keypad, dealer restriction (`Bidding.tsx`) — improved: hero layout (ticker, big name, live tally), struck dealer key, bid pop, turn light
- [x] **Play** — enlarged table with bids, trick summary, Results button (`Play.tsx`) — improved: hero layout (ticker, who leads set big, tally), turn light
- [x] **Results** — made/missed per player, exact-tricks rule, auto-filled last result (`Results.tsx`) — improved: made/missed row flash, themed switch
- [x] **Summary** — standings with round deltas and count-up, leader reorder, next round (`Summary.tsx`) — restyled
- [x] **Winner** — podium, game stats cards, achievement reel, share, new game (`src/screens/Winner.tsx`) — improved: outline-to-fill winner headline, Phosphor trophy
- [x] **Sheets** — Menu, Rules, Scoreboard, Edit round, Upcoming rounds, Seat (rename/avatar/remove), Share (`src/sheets/*`) — improved: Menu in This game / App / Account groups with Quit and End side by side
- [x] **Confirm modal** — end game, quit to home, and other confirmations (`src/components/ConfirmModal.tsx`) — restyled
- [x] **Repair-save modal** — offered when the saved game is corrupt (`RepairSaveModal.tsx`) — restyled
- [x] **Toast** — one slot in the top bar, with Undo / Open actions (`src/components/ui/Toast.tsx`) — improved: flick up to dismiss
- [x] **Banner** — offline / sync / error banner under the header (`ui/Banner.tsx`) — restyled
- [x] **Update prompt** — "New version, Reload" and "Ready to work offline" (`UpdatePrompt.tsx`) — restyled
- [x] **Streak celebration** — full-screen hot/cold streak bursts (`StreakCelebration.tsx`) — restyled
- [x] **Badge pop** — small achievement cards dropping under the top bar (`BadgePop.tsx`) — restyled

Pages (`src/screens/pages/Pages.tsx`, pushed on the nav stack):

- [x] **History** — finished games, search, date range, loading/empty/no-results (`HistoryPage.tsx`, `ui/DateRangePicker.tsx`) — restyled
- [x] **Game page** — one finished game: standings, rounds, share (`GamePage.tsx`) — restyled
- [x] **Boards (leaderboard)** — this month / all time / global, empty state (`BoardsPage.tsx`) — restyled
- [x] **Player page** — stats, trumps, streaks, photo (`PlayerPage.tsx`, `PhotoPicker.tsx`) — improved: hero layout (ticker, who leads set big, tally), turn light
- [x] **Head to head** (`H2HPage.tsx`) — restyled
- [x] **Achievements** (`AchievementsPage.tsx`) — restyled
- [x] **Players** — registry with search (`PlayersPage.tsx`) — improved: hero layout (ticker, who leads set big, tally), turn light
- [x] **Awards** — season awards, loading and error states (`AwardsPage.tsx`) — restyled
- [x] **Wrapped** — yearly recap cards (`WrappedPage.tsx`) — restyled
- [x] **Activity** — signed-in feed, Show more with retry (`ActivityPage.tsx`) — restyled
- [x] **Account** — profile, inbox, sign out (`AccountPage.tsx`, `InboxList.tsx`) — restyled
- [x] **Admin** — users, invites, reset links, merges, overview (`AdminPage.tsx`) — improved: new Appearance tab (theme for everyone)
- [x] **Sign in / Invite / Reset password** (`AuthPages.tsx`) — restyled
- [x] **Live link and recap viewers, Not found** (`ViewerPages.tsx`) — restyled
- [x] **Import** — bring a game in from a link (`ImportPage.tsx`) — restyled

Large-screen UI (`src/screens/desk/*`, tablets and desktops):

- [x] **Desk shell** — rail or top bar navigation, workspace panes (`DeskShell.tsx`, `Nav.tsx`, `Workspace.tsx`) — restyled; lazy pages show the squash-and-stretch loader
- [x] **Desk home, setup, bid pane, play pane, results pane, summary, scoreboard, winner** (`DeskHome.tsx` … `DeskWinner.tsx`) — restyled
- [x] **Desk drawers** — rules, upcoming, coming up, step tracker, score chart, score panel (`Drawer.tsx`, `RulesDrawer.tsx` …) — restyled

## 2. Animations and effects

- [x] **Screen transitions** — slide + fade by nav direction, exit faster than entry (`AppShell.tsx:65`) — preserved, restyled per theme
- [x] **Page recede** — app scales to 0.975 under a sheet or modal (`AppShell.tsx:110`) — preserved, restyled per theme
- [x] **Ambient glow** — trump-tinted glow breathing behind the header (`styles/index.css` `.ambient`) — preserved, restyled per theme
- [x] **Grain and vignette** over every screen (`index.css` `.grain`) — preserved, restyled per theme
- [x] **Home suit orbit** — four suits orbiting the wordmark, frame loop (`Home.tsx:30`) — preserved, restyled per theme
- [x] **Home hero entrance** (`Home.tsx`) — preserved, restyled per theme
- [x] **Desk home floating suits** (`DeskHome.tsx:19`) — preserved, restyled per theme
- [x] **Seat pop-in** — seats scale in staggered 40 ms; dropped seat falls in with a spring (`ui/Table.tsx`) — preserved, restyled per theme
- [x] **Direction arcs flip** — table arrows mirror with a spring when direction changes (`Table.tsx` `Arcs`) — preserved, restyled per theme
- [x] **Dealer chip glide** — dealer token moves seat to seat with `layoutId` (`Table.tsx`) — preserved, restyled per theme
- [x] **First-player chip pop** (`Table.tsx`) — preserved, restyled per theme
- [x] **Bid badge pop** — bid number springs in and out on a seat (`Table.tsx`) — improved: springs in with overshoot and a quarter-turn; the avatar squashes and stretches
- [x] **Made/missed chip pop** on seats (`Table.tsx`) — preserved, restyled per theme
- [x] **Pass arrow** — dashed arrow drawn from seat to seat (`Table.tsx` `arrowFrom`) — preserved, restyled per theme
- [x] **Active seat ring pulse** and **dealer warn pulse** (`index.css` `.ring-pulse`, `.warn-pulse`) — improved: plus a turn light on the rim pointing at the active seat
- [x] **Random dealer spin** — token laps the table twice then settles; reduced motion skips laps (`Step3.tsx:53`) — preserved, restyled per theme
- [x] **Deal animation** — cards fly to seats, card count and trump reveal, skippable (`RoundStart.tsx`) — preserved, restyled per theme
- [x] **Bidder card slide** — old and new bidder cards cross-slide (`Bidding.tsx:78`) — preserved, restyled per theme
- [x] **Selected bid key** — accent fill slides between keys with `layoutId` (`Bidding.tsx:188`) — preserved, restyled per theme
- [x] **Over/under meter** fill (`Bidding.tsx`) — preserved, restyled per theme
- [x] **Summary count-up** — round deltas and totals count up, sparks on gains (`Summary.tsx`, `ui/Counter.tsx`) — improved: variable-weight score while counting
- [x] **Leader reorder** — standings rows reorder with layout animation (`Summary.tsx`) — preserved, restyled per theme
- [x] **Winner podium rise and confetti** — canvas confetti in avatar colours, skipped under reduced motion (`Winner.tsx`, `ui/Confetti.tsx`) — improved: outline-to-fill winner headline, Phosphor trophy
- [x] **Achievement reel** — cards flip in one by one, tap to turn over (`AchievementReel.tsx`) — preserved, restyled per theme
- [x] **Streak celebration** — ember/snow particles per player, tap to advance (`StreakCelebration.tsx`) — preserved, restyled per theme
- [x] **Badge pop** — cards drop in under the top bar and leave (`BadgePop.tsx`) — preserved, restyled per theme
- [x] **Sheet slide and drag-to-dismiss** with velocity projection (`ui/Sheet.tsx:53`) — preserved, restyled per theme
- [x] **Modal scale-in** (`ui/Modal.tsx`) — preserved, restyled per theme
- [x] **Toast drop-in** into the top bar (`ui/Toast.tsx`) — improved: flick up to dismiss
- [x] **Banner slide** (`ui/Banner.tsx`) — preserved, restyled per theme
- [x] **Segmented thumb slide** (`ui/Seg.tsx` `layoutId`) — preserved, restyled per theme
- [x] **Press feedback** — `PRESS` 0.97 / `PRESS_SM` 0.92 and `.press` / `.press-sm` (`ui/motion.ts`, `index.css`) — preserved, restyled per theme
- [x] **Magnetic primary button** on mouse; two-fill cross-fade when enabling (`ui/PrimaryButton.tsx`) — preserved, restyled per theme
- [x] **Spotlight hover** on glass cards (`index.css` `.spot`, `ui/Glass.tsx`) — preserved, restyled per theme
- [x] **Skeleton shimmer** and **spinner** (CSS, `index.css`) — preserved, restyled per theme
- [x] **Suit glow pulse** in the table centre (`index.css` `.suit-glow`, `ui/SuitCenter.tsx`) — preserved, restyled per theme
- [x] **Edge fades** on sideways scrollers and under the header (scroll-driven, `index.css`) — preserved, restyled per theme
- [x] **Avatar photo fade-in** (`ui/Avatar.tsx`) — preserved, restyled per theme
- [x] **Wrapped card entrances** (`WrappedPage.tsx`) — preserved, restyled per theme
- [x] **Stats tiles** count/appear (`ui/Stats.tsx`) — preserved, restyled per theme
- [x] **Desk score chart** line draw (`desk/ScoreChart.tsx`) — preserved, restyled per theme
- [x] **Reduced motion** — `MotionConfig reducedMotion="user"` plus per-effect fallbacks (`App.tsx`) — preserved, restyled per theme

## 3. Sounds and haptics

- [x] **Haptic tick** — `vibrate(10)` on bid, result and confirm taps, feature-detected (`src/hooks/useHaptics.ts`) — preserved
- [x] **No sounds** — the app plays no audio today (checked: no `Audio`/`AudioContext` in `src`) — preserved

## 4. Interactive behaviours and gestures

- [x] **Long-press drag to swap seats** on the setup table (`Step3.tsx:248`, `DeskSetup.tsx:327`) — preserved
- [x] **Tap a seat** to rename, change avatar or remove (`sheets/SeatBodies.tsx`) — preserved
- [x] **Undo** — from the toast and the menu; persisted undo stack (`state/undo.ts`) — preserved
- [x] **Edit a past round** from the scoreboard (`sheets/EditBody.tsx`, `hooks/useRoundEdit.ts`) — preserved
- [x] **Game length** — endless, one cycle, two cycles (`domain/types.ts:5`) — preserved
- [x] **Decks** — one or two decks, seats up to ten (`Step1.tsx`) — preserved
- [x] **Direction** — clockwise / anticlockwise, changes seat layout only — preserved
- [x] **Dealer restriction** — dealer's forbidden bid is struck through and explained (`domain/bidding.ts`) — preserved
- [x] **Exact-tricks rule** on Results and the auto-filled last result (`Results.tsx`) — preserved
- [x] **Demo game** from Home (`domain/demo.ts`) — preserved
- [x] **Use last group** shortcut in setup (`strings` `↺ Use last group`) — preserved
- [x] **Remembered names** chips and recent names (`persistence.ts` `recentNames`) — preserved
- [x] **Share** — share sheet, share image (canvas), share text, live and recap links (`sheets/ShareBody.tsx`, `lib/shareImage.ts`, `ShareLinks.tsx`) — preserved
- [x] **Import a game** from a link (`ImportPage.tsx`) — preserved
- [x] **Keyboard shortcuts** — digits to bid, Enter, ?, Ctrl/⌘+Z (`hooks/useShortcuts.ts`, `desk/useDeskKeys.ts`) — preserved
- [x] **Roving focus** in groups (`hooks/useRovingFocus.ts`) — preserved
- [x] **System Back closes the top sheet/screen** (`hooks/useHistorySync.ts`) — preserved
- [x] **Wake lock** while a game is open (`hooks/useWakeLock.ts`) — preserved
- [x] **Visual viewport** keeps controls above the keyboard (`hooks/useVisualViewport.ts`) — preserved
- [x] **Deep links** — `/r/…` recap, `/l/…` live, invite and reset URLs (`lib/route.ts`, `lib/entry.ts`) — preserved
- [x] **Sign in / out, invite, reset password, admin actions** (`src/sync/*`, `AuthPages.tsx`, `AdminPage.tsx`) — preserved
- [x] **Sync** — background sync with status dot and banners when signed in (`src/sync/engine.ts`, `SyncDot.tsx`) — preserved
- [x] **Player photos** — pick, crop, upload (`PhotoPicker.tsx`, `lib/photo.ts`) — improved: hero layout (ticker, who leads set big, tally), turn light
- [x] **Streaks, achievements, awards, wrapped** computed from games (`src/domain/*`) — preserved
- [x] **Tap to skip** the deal animation and the streak celebration — preserved

## 5. Settings and persisted state

- [x] `kachuful.v1` (current game), `kachuful.v1.backup`, `kachuful.undo`, `kachuful.screen` (`state/persistence.ts`) — preserved
- [x] `kachuful.lastGroup` (names, emojis, colours, direction, decks), `kachuful.recentNames` — preserved
- [x] `kachuful.device`, `kachuful.session` — preserved
- [x] IndexedDB `kachuful` archive: games and player registry (`state/archive.ts`, `state/registry.ts`) — preserved
- [x] Saved-game migrations and the prototype save shape (`state/migrations.ts`) — preserved

## 6. Offline and PWA

- [x] **Installable PWA** — manifest with id, icons, standalone, portrait (`vite.config.ts`) — preserved
- [x] **Precache** of JS, CSS, HTML, fonts; player photos cache-first (`vite.config.ts` workbox) — preserved
- [x] **Update flow** — prompt only, checks on focus and hourly (`hooks/useServiceWorker.ts`) — preserved
- [x] **Offline play** — signed out, everything is local; signed in, sync queues until online — preserved
- [x] **Offline banners** and offline-safe server screens that refresh when the connection returns — preserved

## 7. UI emoji used as icons (to replace with Phosphor; avatars stay emoji)

- [x] Menu rows 👤 🔑 📖 📊 🗓️ ↩️ 🔗 🏁 🏠 (`src/sheets/MenuBody.tsx:17`) — replaced with Phosphor icons
- [x] Seat sheet ✏️ 🗑️ (`src/sheets/SeatBodies.tsx:15`) — replaced with Phosphor icons
- [x] Setup and round copy 👑 👉 🃏 🎲 (`src/strings/index.tsx:120`, `:157`, `:229`, `:332`, `:519`) — replaced with Phosphor icons
- [x] Rules section icons 🪑 🔢 🎯 🏆 (`src/strings/rules.tsx:7`) — replaced with Phosphor icons
- [x] Winner stat cards 🏆 🎯 💥 🔥 🪝 😬 (`src/screens/Winner.tsx:174`, `:227`) — replaced with Phosphor icons
- [x] Places line 🥇 🥈 🥉 (`src/strings/hub.tsx:121`) — replaced with Phosphor icons
- [x] Home "How to play" 📖 (`src/screens/Home.tsx:182`) — replaced with Phosphor icons
- [x] Desk setup ☁️ (`src/screens/desk/DeskSetup.tsx:545`) — replaced with Phosphor icons
- [x] Kept as content, not icons: streak titles 🔥 🚀 🐐 💎 🥶 💀 🪦 🧟 and their particles (personality copy), player avatar
      animals (`src/domain/avatars.ts`), suit symbols ♠ ♦ ♣ ♥, ✓ ✗ result marks

- [x] Found during the redesign and also replaced with Phosphor icons: page empty states (👥 🔍 🔒 🗂️ 📰 🕳️ 🎁 🤝 🌙 📅 ✅
      🌍 ⌛ 🃏 ⚠️), admin and account badges (✉️ 🛡️ ⚠️), Awards and Boards chips (⭐ 👑 📰 🎁 🌍 📱), the Summary and Awards
      leader crown, the password eye (🙈 👁️), photo picker 📷, Continue 🔄, sync ✓, update ✕, Activity feed (🏁 👋 👑),
      Wrapped slide art and History's player count 👤

## Added (not in the app before)

- Three runtime themes and the admin Appearance switcher; a player theme picker while the admin allows it.
- New theme keys in storage: `kf.theme`, `kf.theme.appearance`, `kf.theme.allowOverride`, `kf.theme.user`. No
  existing key or shape changed.
- Motion: deal fan, squash-and-stretch loader, bid pop, outline-to-fill headline, variable-weight score, turn light,
  Results row flash, swipe-to-dismiss toast.

## Proposed removals

None. The lock icon on the dealer's forbidden bid is replaced by the reference's diagonal strike (the key keeps its
"Locked" name and its reason); see DEVIATIONS.md for every other difference.
