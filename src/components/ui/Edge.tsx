const EDGE = {
  gold: 'shadow-[inset_0_0_0_1.5px_var(--gold)]',
  accent: 'shadow-[inset_0_0_0_1.5px_var(--accent)]',
  // A picked card, or the bid already saved: a heavier line.
  brand: 'shadow-[inset_0_0_0_2px_var(--brand)]',
  saved: 'shadow-[inset_0_0_0_2px_var(--accent)]',
} as const;

/** An outline over a card; its own layer because each theme's .glass sets the card's box-shadow. */
export const Edge = ({ tone = 'gold' }: { tone?: keyof typeof EDGE }) => (
  <span
    aria-hidden
    className={`pointer-events-none absolute inset-0 rounded-[inherit] ${EDGE[tone]}`}
  />
);
