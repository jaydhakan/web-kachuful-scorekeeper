# Kachuful

Kachuful is a scorekeeper for the Indian card game Judgement (Kachu Ful). One phone sits on the table and is passed around; the app deals out the round details, collects bids, enforces the dealer restriction and keeps an animated leaderboard. This system is **Midnight Card Room**: a dark felt table, glass panels, gold for status, and an accent colour that follows the trump suit.

The `KachufulApp` component is the full playable prototype (all screens, demo game preloaded: open it and tap *Resume*). The `RoundTable` component shows the shared table in its states.

## Content fundamentals

- **Short, friendly, plain.** "Who's dealing first?", "Someone has to miss", "Back to 3 — climbing again". No jargon beyond the game's own words (bid, trump, hook).
- **Say who and what.** Always name the player: "Riya deals 9 cards each · first card to Kabir".
- **Direction words follow the table.** "left" for clockwise play, "right" for anticlockwise, in every sentence.
- **Signs always shown.** Points read +30, −20, 0. Colour is never the only signal; every green or red has a mark (✓ ✗, + −).
- **Numbers are tabular.** Scores, bids and card counts use tabular figures so columns stay still while counting.

## Visual foundations

- **Felt ground.** `felt-950` background, a `felt-800` radial glow at top-centre, 3–4% noise and a dark edge vignette. Never pure black or white.
- **Glass panels.** `glass` fill, `glass-border` 1px, 16px backdrop blur, `radius-panel`. A panel that matters carries the accent glow.
- **Gold means status.** Crown, dealer token, headings, table rim, winner. Use the `gold-light → gold-mid → gold-dark` gradient; `gold` is the solid fallback.
- **Trump-reactive accent.** Pick the accent from the current trump: spades `accent-spades`, diamonds `accent-diamonds`, clubs `accent-clubs`, hearts `accent-hearts`. It colours active glows, selected pills, the primary button, the trump icon, the progress meter, the table rim glow and the header glow, and it transitions over 600ms at the start of each round. Suit symbols themselves use `suit-black` (♠ ♣) and `suit-red` (♦ ♥).
- **Type.** Bricolage Grotesque 700–800 for display and big numbers, DM Sans 400/500/700 for UI. Hero number 64, screen title 28, player name 18, body 16, caption 13. Nothing smaller than 13px.
- **Layout.** Designed at 390×844, works 360–430 wide, portrait only. 8px grid, 20px side padding, 56px top bar, 96px bottom action bar. Every primary action is in the bottom bar (thumb zone), 60px tall, full width, `radius-button`. Touch targets are at least 48px.
- **Rank colours.** Gold, `rank-silver`, `rank-bronze` for places 1–3.

## Iconography and identity

- **Suits are type glyphs** (♠ ♦ ♣ ♥), not drawn icons.
- **Players are emoji on a coloured circle**, assigned in seat order from `avatar-1`…`avatar-7` and 🦁 🐯 🦊 🐼 🐸 🦄 🐙. Tap to change.
- **Dealer token** is a gold chip with a small deck icon and "DEALS". **"1st"** tags the player who gets the first card, bids first and leads.

## The round table

Top-down oval felt table with a 3px gold rim and an accent glow. Seat 1 is bottom-centre; the others follow the play direction (clockwise runs bottom → left → top → right). Faint dashed arrows show direction. Each seat shows the avatar, name (8 characters, then an ellipsis), the dealer token, the "1st" tag, a bid chip, a pulsing ring on the current bidder and a ✓ or ✗ badge in results. Full size is 340×300, mini is 320×170 and holds seven players without overlapping names.

## Motion

Default easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. Pills spring (1 → 1.12 → 1). Routine taps never wait for an animation. The round start sequence (trump card flips, dealer token glides along the rim, cards fly from the dealer starting at the "1st" seat) is skippable with one tap. With `prefers-reduced-motion` movement becomes a fade and there is no confetti, shake or flying cards.

## Game rules the app implements

- 3–7 players, 52 cards. Max cards: 10 for 3–5 players, 8 for six, 7 for seven.
- Cards per round zig-zag from 3 up to the max, repeat the max once, down to 3, repeat 3 once, then repeat. With `L = 2 × (max − 2)` and `p = i mod L`: cards = 3 + p if p < max − 2, otherwise max − (p − (max − 2)).
- Trump rotates ♠ → ♦ → ♣ → ♥. The dealer is `(firstDealer + i) mod players`; the first player is the next seat.
- The dealer bids last and cannot bid `cards − (sum of the other bids)` when that number is between 0 and the cards dealt.
- Score = max(bid, 1) × 10, positive when the bid is met exactly and negative otherwise. At least one player must miss each round.

Totals are never stored: every score is derived from the round data.
