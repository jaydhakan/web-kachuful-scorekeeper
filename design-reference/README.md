# Kachuful design reference, v2 (three runtime themes)

This replaces the earlier "card room at night" package. The app now ships **three themes** that an admin can switch at runtime:

| Theme id | Name | Scheme | One-line look |
|---|---|---|---|
| `sunset-glass` | Sunset Glass | dark | Frosted glass over a peach-to-pink-to-violet wallpaper, gradient accent, glow |
| `yerba-sun` | Yerba Sun (Butter Cream) | light | Butter background, tomato accent, thick ink outlines, hard offset shadows |
| `editorial-paper` | Editorial Paper | light | Newsprint, ink, one tomato red, serif display, mono labels, hairline rules, green table |

Default theme: `sunset-glass`.

## How to use this folder

1. Put the whole folder in the repo, for example `./design-reference/`.
2. Open `CLAUDE_CODE_PROMPT.md` and paste everything below its first horizontal line into Claude Code, run from the repo root.
3. Claude Code reads the specs in the order the prompt lists.

## Contents

- `CLAUDE_CODE_PROMPT.md` — the prompt (rules, phases, definition of done).
- `specs/THEMES_SPEC.md` — every token for every theme, component recipes, fonts, hero Bidding layout, contrast results.
- `specs/ADMIN_THEME_SWITCHER.md` — how the admin picks a theme at runtime: registry, no-flash bootstrap, API, offline, code samples.
- `specs/MOTION_SPEC.md` — the six motion ideas plus the v1 motion list, with timing and reduced-motion rules.
- `specs/INSPIRATION_LOG.md` — what was researched, what was verified, and where each idea landed.
- `specs/DESIGN_SPEC_v1_structure.md` — the v1 spec. Its structure, component list, per-screen notes and motion list still apply. Its colour direction and "forbidden" list are superseded by `THEMES_SPEC.md`.
- `specs/BACKEND_REQUESTS_TEMPLATE.md` — format for `backend-requests.md`.
- `reference-html/` — `kf.css` (component geometry), `themes.css` (the three themes), one static HTML file per screen, and `BiddingHero.dc.html` (the new hero Bidding layout). Each screen file has a `.app` root; add `data-theme="sunset-glass"` (or another id) to it, and load `kf.css` then `themes.css`. Ignore the `<x-dc>` and `support.js` wrapper, which belongs to the design tool.
- `motion/Motion.dc.html` — the six animations, running (open in a browser).
- `screenshots/themes/<theme-id>/` — all 16 screens plus `BiddingHero.png` in each theme, at 360x780 (2x). This is the target.
- `screenshots/before/` — the current app.
- `explorations/` — contact sheets of the 22 directions that were considered. Reference only, do not implement.

Fonts load from Google Fonts in the reference files. In the app, self-host them (see `THEMES_SPEC.md`).
