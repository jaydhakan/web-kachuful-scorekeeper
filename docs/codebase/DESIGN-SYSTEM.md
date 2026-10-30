# Design system: Midnight Card Room

Source of truth: `src/theme/tokens.json` (copied from the design handoff). `src/theme/extended.json` holds the colours and gradients the prototype used that the tokens file does not define; they are needed for parity and should be proposed upstream.

## How tokens reach the code

- `tailwind.config.ts` turns every colour token into a Tailwind colour (`bg-felt-950`, `text-ink-on-accent`, `bg-sheet/95`) and adds the type sizes the screens use as `text-13 … text-96`.
- The same file writes the `:root` CSS variables (`--bg`, `--tx`, `--tx2`, `--dis`, `--gold`, `--pos`, `--neg`, `--warn`).
- `src/styles/index.css` reads colours with `theme()`; nothing is hard-coded.
- The accent follows the trump: `Phone` sets `--accent`, `--glow` and `--suit` from `src/theme/trumps.ts`. The swap is instant: transitioning an inherited variable on the root restyles the whole tree every frame, so the change is shown by an opacity-only colour wash instead.
- ESLint rejects hex colour literals in `src/components`, `src/screens` and `src/sheets`.

## Rules

- Gold means status. Accent follows the trump. Positive and negative colours always come with a sign or a mark.
- Score numbers use tabular figures; display type is Bricolage Grotesque, UI type is DM Sans (both self-hosted variable fonts).
- Component-intrinsic sizes (a 60px button, a 66px dealer chip) stay as arbitrary values; colours and font sizes do not.
