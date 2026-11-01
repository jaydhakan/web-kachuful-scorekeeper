/**
 * One thin strip of live round status that loops sideways (DESIGN-SYSTEM.md, Hero layout). Decorative: the header says the same
 * thing, so it is hidden from assistive tech. The content is doubled so a -50% translate loops without a seam; reduced
 * motion stops it.
 */
export function Ticker({ items }: { items: string[] }) {
  const run = (
    <span>
      {items.map((s, k) => (
        <span key={k}>
          {s} <i>●</i>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden className="ticker">
      <div>
        {run}
        {run}
      </div>
    </div>
  );
}
