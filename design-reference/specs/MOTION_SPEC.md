# Motion spec

Open `motion/Motion.dc.html` in a browser to see all six loops running. Its CSS is the reference implementation.

**Rule zero:** existing animations, sounds, haptics, confetti and celebrations in the current app stay. Everything here is additive, or a restyle of what exists. The v1 list in `DESIGN_SPEC_v1_structure.md` ("Motion: built vs specified") still applies: card flip, flying cards, bid-badge FLIP to seat, active-ring handoff, score count-up, drag-to-dismiss sheets, shared table transition.

**Technical rules:** animate `transform` and `opacity` (plus `clip-path` for the outline reveal and a registered custom property for the counter). Do not animate `box-shadow`, `filter` or layout properties. Infinite animations are limited to the active-seat ring and the ticker. Honour `prefers-reduced-motion` (replace movement with a 150ms opacity fade, stop the ticker and ring pulse). Feature-detect View Transitions and `navigator.vibrate`.

## The six ideas

| # | Name | Where it lives | Behaviour | Source of the idea |
|---|---|---|---|---|
| 1 | **Deal fan** | Round intro, and "Deal" on the Ready screen | Five cards leave the deck in a staggered arc (stagger 140ms, ease `cubic-bezier(.22,1,.36,1)`, about 4.2s loop in the demo, once in the app). Each card rotates `(index - 2) * 7deg`. Settle, then fade | Corn Revolution: staged depth, sequenced reveals |
| 2 | **Squash-and-stretch loader** | App start, loading a saved game, any wait over 300ms | A ball bounces (1s loop) with squash on contact (`scale(1.25,.75)`), stretch in flight (`scale(.94,1.08)`), and a shadow that shrinks with height. A percent counter runs beside it using `@property --n` (integer). Fall back to plain text where `@property` is missing | Don't Board Me: playful loader |
| 3 | **Bid pop** | When a bid is confirmed | Avatar squashes (`1.18,.84`), then stretches up 8px, then settles (about 400ms). The bid badge springs from `scale(0) rotate(-40deg)` to `1.35` and back to `1` with a small overshoot. Pair with a light haptic | Dropbox brand site and Rive: characters with personality |
| 4 | **Outline-to-fill headline** | Round winner and game winner headlines on Results and end-game | Headline draws as a 1.2px outline, then a `clip-path: inset(0 100% 0 0)` layer reveals the filled accent colour left to right (about 1.8s), holds, wipes out | Corn Revolution: masked outline headline |
| 5 | **Variable-weight score** | Score changes on the Scoreboard and Playing screens | The score's font weight and tracking ease between a light and heavy value when it changes, then settle on the normal weight, alongside a count-up. Needs a variable font (Unbounded in the demo; in the app use the active theme's display font and a weight range it supports) | Epic: responsive typography |
| 6 | **Turn glow and table tilt** | The table, whichever player's turn it is | A conic light chases the rim (4s linear) to show whose turn it is; the table sits in slight perspective (`rotateX` 34 to 52deg in the demo; keep it to a few degrees in the app so seats stay readable). On Editorial Paper, replace the glow with an ink rule that slides to the active seat, because that theme is flat | Lusion: light and depth |

## Theme-specific feel

- **Sunset Glass:** glow and light are allowed. Selected keys glow, the table has a soft underglow, sheets rise with a slight blur-in.
- **Yerba Sun:** movement is bouncy and physical. Keys press in (2px translate), buttons lift on press, the ticker is slightly tilted and always moving, sticker-style pops.
- **Editorial Paper:** movement is restrained. Rules draw in, numerals count up, no bounce, no glow. Use opacity and small translations only.

## New feedback to add (from the research)

Colour-coded feedback is a common thread in well-made mobile games: make success and failure obvious without text.
- On Results, "made" rows flash the theme's success colour, "missed" rows the danger colour (soft fill, 200ms), then settle.
- Selecting a bid key gives immediate press feedback (scale 0.97 or the hard-shadow press on Yerba Sun) within one frame.
- Leader changes on the scoreboard animate the row swap (FLIP, 300ms).
- Never let flourish slow the bid flow. Anything that would delay a tap must be skippable and never block input.

## Timing

Press feedback 100 to 160ms. Element enter/exit 200 to 300ms. Hero moments (deal, winner) 1.2 to 2.4s and always skippable ("Tap to skip" exists on the intro). Use `cubic-bezier(.22,1,.36,1)` for entrances and `cubic-bezier(.65,0,.35,1)` for in-place changes.
