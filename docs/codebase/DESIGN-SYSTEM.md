# Design system: Midnight Card Room

Source of truth: `src/theme/tokens.json` (copied from the design handoff). `src/theme/extended.json` holds the colours and gradients the prototype used that the tokens file does not define; they are needed for parity and should be proposed upstream.

## How tokens reach the code

- `tailwind.config.ts` turns every colour token into a Tailwind colour (`bg-felt-950`, `text-ink-on-accent`, `bg-sheet/95`) and adds the type sizes the screens use as `text-13 … text-96`, in rem (`text-16` is `1rem`), so browser and OS text-size settings work.
- The same file writes the `:root` CSS variables (`--bg`, `--tx`, `--tx2`, `--dis`, `--gold`, `--pos`, `--neg`, `--warn`).
- `src/styles/index.css` reads colours with `theme()`; nothing is hard-coded.
- The accent follows the trump: `AppShell` sets `--accent`, `--glow` and `--suit` from `src/theme/trumps.ts`. The swap is instant: transitioning an inherited variable on the root restyles the whole tree every frame, so the change is shown by an opacity-only colour wash instead.
- ESLint rejects hex colour literals in `src/components`, `src/screens` and `src/sheets`.

## Rules

- Gold means status. Accent follows the trump. Positive and negative colours always come with a sign or a mark.
- Score numbers use tabular figures; display type is Bricolage Grotesque, UI type is DM Sans (both self-hosted variable fonts).
- Component-intrinsic sizes (a 60px button, a 66px dealer chip) stay as arbitrary values; colours and font sizes do not.

## Layout and sizing

- **Breakpoints** live in `src/theme/breakpoints.ts` and become Tailwind screens: `land:`, `md:`, `wide:`, `pane:` (land or wide), `roomy:` (md or wide). Pick the layout with these; use container queries for anything inside a component.
- **Container queries** come from `@tailwindcss/container-queries` (`@sm:`, `@[26rem]:`) plus two height variants, `@h-short:` (40rem) and `@h-tiny:` (32rem), which answer to the nearest size container (the Scaffold root).
- **Type never uses an in-between size.** It moves between the existing scale steps at a breakpoint or container size (a large title `text-30` to `text-36`, the table's suit `text-34` to `text-40`); `clamp()` is for spacing and the table only.
- **Touch targets** are at least 44px (`max(44px, 2.75rem)`), hover styles apply only on devices that can hover (`future.hoverOnlyWhenSupported`), and every control has a visible focus ring.
- **The table has its own unit.** Inside a table, sizes are `calc(N * var(--s))` where `--s` is one design pixel at the table's current size, so an avatar, a bubble or a chip scales with the seats; text stays on the type scale and never shrinks below `text-13`.
- **Scrollbars** are hidden on touch and thin and themed on devices with a fine pointer (`.scroll-thin`); a hidden scrollbar on a laptop hides the fact that content scrolls.
