# Prompt for Claude Code: restyle Kachuful with three runtime themes

Put this whole folder in the repo (for example `./design-reference/`). Run Claude Code from the repo root and paste everything below the line.

---

## Role

You are a principal product designer and senior front-end engineer. Restyle the Kachuful PWA (a Judgement / Kachuful card-game scorekeeper, mobile-first) so it matches the reference in `design-reference/`, and build a **runtime theme system** with an **admin theme switcher**. The app is for friends playing together, so it should feel fun, modern and crafted, and must not look like generic AI output.

## What you are building

Three themes, switchable live by an admin, all from one codebase and one set of components:

- `sunset-glass` (dark, **default**): frosted glass over a peach, pink and violet wallpaper, gradient accent, glow.
- `yerba-sun` (light): butter background, tomato accent, thick ink outlines, hard offset shadows, sticker feel.
- `editorial-paper` (light): newsprint, ink, tomato red, serif display, mono labels, hairline rules, green table.

Plus: a hero Bidding layout (ticker, big player name, live tally), a set of motion ideas, and an admin "Appearance" setting that picks the theme.

## Read these first, in this order

1. `design-reference/README.md`
2. `design-reference/specs/THEMES_SPEC.md` — tokens, materials, fonts, hero layout, contrast.
3. `design-reference/reference-html/themes.css` and `kf.css` — working CSS. Port it into this repo's styling approach. Do not copy it blindly, and do not hard-code anything it defines as a variable.
4. `design-reference/specs/ADMIN_THEME_SWITCHER.md` — runtime theme selection.
5. `design-reference/specs/MOTION_SPEC.md` and `design-reference/motion/Motion.dc.html` — the six motion ideas, rules and timing.
6. `design-reference/specs/DESIGN_SPEC_v1_structure.md` — structure, component list, per-screen notes, motion built-vs-specified. Its colour direction and "forbidden" list are superseded by `THEMES_SPEC.md`.
7. `design-reference/specs/INSPIRATION_LOG.md` — what the design drew on, and what is unverified.
8. `design-reference/reference-html/*.dc.html` — one file per screen, plus `BiddingHero.dc.html`. Open in a browser with `kf.css` and `themes.css` beside them. Ignore the `<x-dc>` and `support.js` wrapper.
9. `design-reference/screenshots/themes/<theme-id>/` (the target, all screens in each theme), and `screenshots/before/` (the current app).

## Non-negotiable rules

**1. Nothing may get worse. No downgrades.**
- Do not remove, simplify or flatten any existing animation, transition, sound, haptic, confetti, count-up, deal animation, trump reveal, winner celebration or micro-interaction. They are product personality.
- If a design changes how an effect looks, keep the effect and restyle it in the new system. If an effect must change structurally, replace it with one that is equal or better, never with nothing.
- The motion in `MOTION_SPEC.md` and in the v1 "Motion: built vs specified" list is **additive**. Implement it too.
- Before changing anything, write `INVENTORY.md` at the repo root: every screen, every animation or effect, every interactive behaviour, setting and gesture that exists today (for example long-press drag to swap seats, undo, endless / 16 / 32 round modes, demo game, share sheet, offline behaviour). At the end tick off each item as preserved, restyled or improved. Anything you want to drop goes under "Proposed removals" and stays in place until I approve it.

**2. No functionality removed. No logic changed.**
- Scoring, dealing, dealer rotation and restriction, undo, persistence, offline play, accounts, boards, history, achievements, awards, wrapped, admin, invite and reset flows keep working exactly as today. Do not touch scoring or dealing logic.
- If a design needs a data change (a new field, a derived value, a setting), add it backward-compatibly and migrate saved games and local storage safely.
- The PWA stays installable and works offline with the same service worker behaviour. All existing routes and deep links keep working.

**3. Themes change paint, not geometry.**
Every control keeps the same size and a hit area of at least 48px in every theme. Themes differ only in colour, type, radius, border, shadow and material. This is what makes live switching safe and layout-shift-free.

**4. Screens not in the reference adopt the same system.**
Boards, History, Game page, Player page, Head-to-head, Achievements, Players, Awards, Wrapped, Activity, Account, Admin, Sign in, Invite, Reset password, Not found, end-game and winner screens. Reuse the shared components (Button, IconButton, Segmented, Chip, Avatar, Seat, NumberKey, ListRow, Sheet, Toast, Stepper, Toggle). Add empty, loading (skeleton rows) and offline/error states for each. Check `before/` for what exists today.

**5. Design may not silently fork from the reference.**
Where the reference and the real app disagree (copy, states, data), keep the real app's functionality and apply the reference's look. List each such decision in `DEVIATIONS.md`.

## Backend requests

If any change needs server support, do not fake it and do not silently drop it. Create `backend-requests.md` at the repo root using `design-reference/specs/BACKEND_REQUESTS_TEMPLATE.md`. For each request include: the screen and design element, what the UI does today, what the new UI needs, a proposed endpoint or field with example request and response, auth and permission notes, offline behaviour, and the client-side fallback you built meanwhile. Expected entries:

- **Appearance settings** (required): `GET /api/settings/appearance`, `PUT /api/admin/settings/appearance`, optional `PATCH /api/me/preferences` for per-user theme. Details in `ADMIN_THEME_SWITCHER.md`. Include an audit trail of who changed the theme and when, and a freshness mechanism (push event if the app has realtime, otherwise polling on focus).
- remembered player names syncing across devices for signed-in users
- last-used player count and deck preferences saved per account
- "Resume game" summary on Home for signed-in users
- standings trend (up or down per round) if it can't be derived from stored rounds
- any new award, stat or preference that new Boards, History or Player screens show

The UI must still work without the backend: local-first, signed-out and offline all keep working.

## Process

1. Detect the stack and where colours, fonts and radii are defined. Summarise in a few lines.
2. Write `INVENTORY.md`.
3. **Phase 1, tokens and themes.** Port `kf.css` and `themes.css` into the repo's styling system. Replace every hard-coded colour with a theme variable. Self-host fonts (Latin subset, variable where available, `font-display: swap`) and load only the active theme's fonts: Instrument Sans (all themes), Bricolage Grotesque and Space Mono (Yerba Sun), Instrument Serif and DM Mono (Editorial Paper). Add the no-flash bootstrap script and the theme registry from `ADMIN_THEME_SWITCHER.md`. At this point the app should render correctly in all three themes by changing `data-theme` in dev tools.
4. **Phase 2, shared components.** Build or restyle the shared components against the specs. Replace UI emoji with Phosphor Icons (regular weight). Suits are custom SVGs (see the reference `<symbol>` definitions). Player avatars stay animal emoji on the avatar palette circles.
5. **Phase 3, screens.** Apply the reference screen by screen in all three themes, then the screens not in the reference. Implement the hero layout (ticker, big name, tally) on Bidding and Playing.
6. **Phase 4, motion.** Keep every existing animation. Add the six motion ideas and the feedback additions from `MOTION_SPEC.md`. Transform and opacity only (plus the clip-path and registered-property cases listed). Honour `prefers-reduced-motion`. Feature-detect `navigator.vibrate`, View Transitions and `backdrop-filter`. Add the fallbacks for Sunset Glass (opaque surfaces without `backdrop-filter` or under `prefers-reduced-transparency`).
7. **Phase 5, admin theme switcher.** Add the "Appearance" section to the Admin screen exactly as in `ADMIN_THEME_SWITCHER.md`: live preview cards, "Preview on this device", "Apply to everyone" with undo, optional "Let players choose their own theme", resolution order, offline cache, local-only fallback with a clear notice, aria-live announcement, admin-only enforcement on the server side. Write the backend requests.
8. **Phase 6, audit.** Check all 16 reference screens and the unreferenced ones, in all three themes, at 360x780 and 412x915, with real screenshots. Fix overlaps and label wrapping. Check contrast (the table in `THEMES_SPEC.md` is the baseline), tap targets of at least 48px, and keyboard focus. Verify live switching during an active game: no state loss, no layout shift. Grep for leftover emoji icons and hard-coded hex values outside the theme file.
9. Commit once per phase with a clear message. Don't squash phases together.

## Skills

If installed, use `frontend-design` before Phase 1, `emil-design-eng` and `review-animations` before Phase 4, `web-design-guidelines` for the audit, `verification-before-completion` before claiming anything is done. If one isn't installed, say so and carry on.

## Quality guardrails

- **Performance:** limit `backdrop-filter` to the components listed in `THEMES_SPEC.md`; never blur a full-screen layer that animates. Keep the first render fast: only the active theme's fonts block rendering. Test on a mid-range Android phone.
- **Legibility over style:** on Sunset Glass test text over the brightest part of the wallpaper. On Yerba Sun keep the ink outlines but don't let them crowd small text. On Editorial Paper keep mono labels from wrapping (reduce tracking on small buttons).
- **Restraint:** the ticker is one thin strip, not a marquee everywhere. Kinetic type, tilt and glow are for hero moments, not every screen.
- **Consistency:** a new component or state must be added for all three themes at once.

## Known fixes the reference already made (keep them)

- Dealer marker is a "D" disc at 4 o'clock; first-player chip at 12 o'clock; bid badge at 8 o'clock; fixed anchors so they never collide.
- Dealer's disallowed bid key gets a diagonal strike, no lock emoji, no dashed border.
- `text-3` is only for non-essential hints and seat numbers. Status-bearing disabled buttons use `text-2`.
- Segmented controls are 48px tall and every control has a 48px hit area, even where the visible control is smaller.

## Definition of done

- `INVENTORY.md` fully ticked; zero unapproved removals.
- Every existing animation and wow moment still present, restyled; specified new motion implemented and skippable.
- No functionality regressed: existing tests pass; a manual full game (setup, seat, deal, bid, play, results, scoreboard, edit round, undo, end game, winner) works online and offline in all three themes.
- All three themes render every screen with no overlaps or wrapping at 360px; tap targets at least 48px; AA contrast verified, with exceptions listed in `DEVIATIONS.md`.
- Admin can change the theme at runtime; it applies without a reload or a flash, survives offline, and falls back safely. `backend-requests.md` exists and covers appearance settings.
- No hard-coded colours outside the theme file; no emoji UI icons.
- Final message: before/after screenshots per screen in each theme, what you preserved, what you added, open questions.

If anything here conflicts with the "no downgrade, no removal" rule, that rule wins. Ask me before removing anything.
