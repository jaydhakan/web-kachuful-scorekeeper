# Two fixes, screen polish, and the Me screen — plan

Working doc (never committed; deleted when done). Nothing here changes the API.
Point 2 of Jay's message (spacing) is already fixed; this covers points 1 and 3.

---

## Part A · Two open fixes

### A1. `npm run dev` fails

- Cause: the `preload-shell` plugin in `vite.config.ts` reads the production bundle to add preload links, so on the
  dev server it finds no chunks and throws ("no chunk for /src/screens/desk/DeskShell.tsx").
- Fix: give the plugin `apply: 'build'` so it only runs on `vite build`. Dev needs no preloads.
- Check: `npm run dev` serves Home; `npm run build` output still has the preload links (existing PWA/perf tests).

### A2. Boards: the "You" outline doesn't show

- Cause: the row draws its outline with `shadow-[inset…]`, but each theme's `.glass` sets its own `box-shadow`,
  which wins. Same bug the achievements cards had.
- Fix: draw it as an overlay layer like `GoldEdge`, in the accent colour (a small `edge` option on `GoldEdge`, or an
  `AccentEdge` beside it in `Medal.tsx`).
- Also: the pinned "You" row covers the row under it with a look-alike card (Jay's first screenshot). Give the
  pinned row a soft drop shadow so it reads as floating above the list.

---

## Part B · Ideas for other screens (general polish, not achievements/awards)

Ranked by what players notice most. Each is small and independent; pick any.

| # | Screen | Idea | Why |
|---|--------|------|-----|
| 1 | Home | Drop the "Signed in as Jay" pill; the account chip top-right already says it. | Two things saying one thing; frees the top bar. |
| 2 | Home | When signed in with games, shrink the big "Kachuful" hero so the rank / Almost there cards sit higher. | The logo takes ~40% of a phone screen every visit. |
| 3 | History | Show "From the server" only on the exceptions (not yet synced, only on this phone), not on every card. | A badge on every card is noise; the exception is the news. |
| 4 | History | Winner's avatar beside "Jay won · +10", and sticky day headers while scrolling. | Faster scanning of a long list. |
| 5 | Players | Replace the big separate pencil tile with a small trailing edit icon inside the row (still 44px). | The pencil tile doubles every row's visual weight. |
| 6 | Player page | A hero header: big photo, name, rank, games, achievements ring, then the stats. | Today it opens straight into numbers. |
| 7 | Game page / recap | Podium medals (gold/silver/bronze) on the final standings, like Awards and Winner. | One visual language for "who won". |
| 8 | Boards | Rank movement arrows animate in once per visit; "You" row fix (A2). | Small delight, real information. |
| 9 | All pages | One loading pattern (skeletons) and one empty-state pattern everywhere; audit pages that show a bare sentence. | Consistency reads as quality. |
| 10 | Account | Shorten "Upload games from this phone" to "Upload this phone's games" (wraps to 2 lines in caps themes). | Superseded if Part C ships. |

---

## Part C · Account becomes "Me", and photos everywhere

### C1. Photos: show the photo wherever a player appears

Found by search; each shows the emoji even when the player has a photo:

| Where | File |
|---|---|
| Home account chip (top right) | `src/components/AccountChip.tsx` |
| Award cards ("🦊 Jay") | `src/screens/pages/AwardsPage.tsx` |
| Achievements player chips | `src/screens/pages/AchievementsPage.tsx` |
| Winner achievement reel ("🦊 Jay") | `src/components/AchievementReel.tsx` |
| Wrapped: nemesis / partner, picker chips | `src/screens/pages/WrappedPage.tsx` |
| Admin people list | `src/screens/pages/admin/People.tsx` |
| Viewer (shared link) player list | `src/screens/pages/ViewerPages.tsx` |

- Add one inline component, `PlayerTag` (small `Dot` with photo + name), and use it in every "emoji + name" spot.
- AccountChip uses `Dot` (photo-aware) instead of the raw emoji.
- Guard: a unit test that renders each of these with a player who has a `photoUrl` and expects the `<img>`; plus a
  source guard test like `names.guard.test.ts` that fails on `{x.emoji} {x.name}` patterns in pages.
- Check desk setup seats (`DeskSetup.tsx`) and the table: they render seat emoji for game seats; confirm whether a
  seat linked to a registry player should show the photo (likely yes, via `Dot`).

### C2. The Me screen (revamp of Account)

Same route and data; a new layout. iOS-style grouped list, one email shown once, the photo as the hero.

```
┌──────────────────────────────┐
│ ‹  Me                        │
│                              │
│        ( big photo )  ✎      │  tap photo → change/remove (sheet)
│           Jay                │
│      Jay Dhakan · email      │
│  ┌────────┬────────┬───────┐ │
│  │ #1 of 9│ 14 games│ 23/67 │ │  rank, games, achievements ring
│  └────────┴────────┴───────┘ │  each opens its screen
│  [ View my player page   › ] │
│                              │
│  SYNC                    ●   │
│  Last synced 1 min ago       │
│  [ Sync now ] [ Upload ]     │
│                              │
│  NEEDS YOU (2)               │  hidden entirely when empty
│                              │
│  SETTINGS                    │
│  Theme                     › │  opens the existing theme sheet
│  Change password           › │  opens a sheet (form moves there)
│  Admin                     › │  admins only
│                              │
│  [ Sign out ]  (danger, full)│
└──────────────────────────────┘
```

- **Hero:** large `Avatar` (photo or emoji), name, full name and email once (the header eyebrow goes). Tap the
  photo for Change / Remove photo in a sheet (reuses `PhotoPicker`). Edit opens the existing edit form.
- **Stats strip:** rank (from the profile already loaded), games, achievements ring; each taps through.
- **Sync:** status line and two equal buttons (as fixed today).
- **Needs you:** only when there are items, with a count in the heading; no "Nothing needs you" card.
- **Settings rows:** Theme (existing sheet), Change password (form moves into a sheet), Admin (admins).
- **Sign out:** full-width danger button at the bottom, same confirm dialog.
- **Name:** title "Me"; the Home chip and menu say "Me" too (strings only). Keep the `account` route id so saved
  screens and tests keep working.
- **States:** signed out (unchanged sign-in prompt), profile loading (skeleton stats), offline (stats from cache with
  the existing offline note), no photo (emoji hero).
- **Accessibility:** 44px rows, real buttons, focus returns to the row after a sheet closes.

### C3. Tests and checks

- Update `account.test.tsx` and `e2e/accounts.spec.ts` for the moved password form and the "Me" title.
- New tests: stats strip numbers, Needs you hidden when empty, photo shown in the hero and the Home chip.
- Screenshots at 390×844 in two themes (sunset-glass, emerald-gilt), signed in via the mock API.

## Order

A1 → A2 → C1 (photos) → C2 (Me) → Part B items Jay picks. One commit each; push when Jay says.
