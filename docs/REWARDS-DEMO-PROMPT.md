# Prompt: build the rewards demo (paste everything below the line into a new chat)

---

You're building a **clickable demo**, not app code. It's one self-contained HTML file that lets me (Jay, the owner) see
and hear every idea in the rewards plan. I'll use it to decide what to build and what to cut. Don't touch `src/`, the
backend, `package.json` or git. Don't commit anything.

## Read first (in this repo, `web-kachuful-scorekeeper`)

1. `CLAUDE.md`: the house rules.
2. `docs/REWARDS-PLAN.md`: **the source of truth for the demo.** Pay most attention to:
   - §3 avatars at the table, including the wireframes
   - §4 the avatar model and clothing
   - §5 juice and avatar states
   - §6 crowns and the Kursi
   - §7 the night and Wrapped
   - §9 Sikke
   - §10 the Bazaar
   - §11 sounds
   - §12 the moment catalogue
   - §13 the budget and queue rules
   - §18 decisions
3. `docs/SOUND-PLAN.md`: the 13 new synth sounds, and the tiers.
4. The real look, so the demo matches the app:
   - `src/styles/themes.css` and `src/styles/themes/*.css`: four themes, `sunset-glass`, `editorial-paper`,
     `emerald-gilt` and `yerba-sun`. **Copy their real token values.** The tokens include `--bg`, `--surface-*`,
     `--text-*`, `--brand`, `--felt*`, `--medal-gold`, the fonts and so on. Don't invent colours.
   - `src/components/ui/Avatar.tsx`: how an avatar is drawn today (an emoji on a colour, with a photo over it).
   - `src/components/ui/Table.tsx` and `src/lib/tableGeometry.ts`: the felt table, seat sizes 44/32/68px, and the
     ×0.8 scale from 11 players.
   - `src/fx/sound.ts`: the existing Web Audio synth helpers (`tone`, `noise`). Reuse that approach for the sounds.

## Output

- **File:** `docs/REWARDS-DEMO.html`. It's a working doc: never commit it, and delete it along with the plan.
- **Code:** vanilla HTML, CSS and JS in that one file. No build step, no npm, no CDN scripts. Google Fonts links for
  the theme fonts are fine. It must open by double-clicking.
- **Layout:** a phone frame of 390×844, centred, plus a fixed control bar:
  - a theme switcher for the 4 themes
  - a reduced-motion toggle
  - sound: all / moments / off
  - late-night quiet on/off
  - a scene menu
- **At phone width,** drop the frame and go full screen. Then I can open it on my phone too.
- **Data:** fake, with Indian names: Riya, Dev, Asha, Kabir, Meera, Arjun, Zoya, Vikram, and 11 for the crowded table.
  Show a small "DEMO, made-up data" tag.

## Rules the demo must follow (the same as the app)

- Animate **only `transform` and `opacity`**. With reduced motion on, every animation becomes a still end state or a
  short fade.
- Tap targets are at least 44px, use real `<button>`s, and show visible focus rings.
- Colours come only from the copied theme tokens. Add cloth colours as new tokens per theme, the way §4.4 says.
- **No religious or sacred symbols** on any item. No Gandhi topi, no real team kits.
- Clothing and busts are **drawn in inline SVG** in one consistent flat style. Keep it simple: shapes, not
  illustrations. One bust base, with layers swapped on top in the order from §4.2.
- Sounds are synthesised with Web Audio, with no audio files. They play only after the first tap.

## Scenes (one per menu entry; each has a "Play" button that replays it)

1. **Avatar model, A vs D** (my decision #1, so make it the clearest scene).
   - Show the same 6-player Kachuful table twice, side by side or with a toggle.
     - **A:** hat and accessory drawn on every seat avatar.
     - **D:** a plain seat token with frame ring and one pip, plus a stage bust that rises at a win.
   - Show both at the real sizes 44, 32 and 26px (the 11-player crowded table), so I can see what's readable.
   - Add a "with photo" switch: a photo face on an illustrated outfit. A gradient circle can stand in for the photo.
2. **Kachuful round result.** Seat tokens react using the §5.2 states: confident, shocked (bust), sweating, smug
   leader, sulking last, and on fire. Status pips are ranked as in §3.
3. **Stage bust.** A game win: the seat rises into a 72px+ bust in full outfit with aura and badge, then settles
   back. Include a skip-by-tap.
4. **Kursi chheeni!**
   - The chair slides from the holder's seat to the winner's, with the "defences" count reset.
   - Add a name toggle, **Kursi / Belt**, so I can compare (my decision #3).
   - Also show a successful defence (+1, a smaller beat).
5. **The line at the deal.** The table intel line during the 3-second deal. Cycle through 4 examples: a rivalry, a
   crown at stake, a bounty, and a streak.
6. **Crowns.** The four marks (Aaj ka Sitara, Kursi, Taj, Legend) on a leaderboard, plus live stat crowns from §6.2.
   Show a "Taj chheena!" moment.
7. **Wardrobe.**
   - The dressing room: Libaas, headwear, neckwear, aura, frame.
   - The 5 sets with the set-complete flourish.
   - Colour variants, and locked items with prices.
   - Lungi-banian as the joke legendary.
8. **Bazaar.** The week's 6 items, the time to Monday's refresh, buying, and gifting an item (opened at the table
   with a small unwrap).
9. **Sikke at game end.** The coin tally ticking up, line by line (finish, win, achievement, Kursi, bounty), with the
   level bar. Use the §9 numbers and prices.
10. **Baithak Wrapped.** The night's 8 cards from §7.2 as a swipeable story, with dots and tap left/right. Include
    the kind-worded "worst bid" card.
11. **Moment budget lab.** Buttons that fire events fast: made bid, bust, achievement, big achievement, Kursi
    change, game end, and "fire 10 at once".
    - Show the queue live: what plays, what gets capped or downgraded to a small card, and what merges.
    - Follow the §13 rules exactly: hold the big shows until a pause, at most 1 Moment per round, 3 per game plus the
      game end, and 3 crown shows per night.
    - Show the counts on screen.
12. **Sound board.**
    - Every sound from SOUND-PLAN §3 and REWARDS-PLAN §11 as a button, grouped by tier, with a one-line "plays
      when".
    - Show what late-night quiet does (lower gain, no big stingers).
    - Play an "a night in 20 seconds" sequence of the cues in order.
13. **The gaps fixed.** The Ishaara team strip with faces (board, clue phone, win), and the Spades scorekeeper's
    Tricks and Summary rows with avatars, as in §3.2.

## The review part (this matters most)

- **Every scene has a decision bar at the bottom:** **Keep / Change / Cut**, a priority of 1–3, and a notes box.
  Save it in `localStorage`, wrapped in try/catch.
- **A "My decisions" page** lists every scene's choice. It has an **"Copy as Markdown"** button that produces:

  ```
  ## Rewards demo decisions (date)
  - Avatar model: D — Keep, P1 — "notes…"
  - Kursi name: Belt
  ...
  ```

  I'll paste that back into a chat to update `docs/REWARDS-PLAN.md`.
- **Decision #1 and decision #3** each get an explicit A/D and Kursi/Belt pick on that page.

## When you're done

- Open the file in a browser with Playwright, if it's available. Click through every scene in all 4 themes, with
  reduced motion both on and off, and at 390px and desktop width. Check the console for errors.
- Delete any screenshots you made.
- Tell me, in a short list:
  - which scenes work
  - what's simplified or faked
  - anything in the plan that turned out awkward once you drew it (be honest, since that's the point of a demo)
