const SPADE =
  'M50 6C62 25 93 39 93 62C93 76 81 85 68 85C61 85 56 82 53 78C54 85 57 90 64 95L36 95C43 90 46 85 47 78C44 82 39 85 32 85C19 85 7 76 7 62C7 39 38 25 50 6Z';

/** The spade itself, in the current colour: drawn, so it never turns into an emoji on any phone. */
export function Spade({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      focusable="false"
      className={className}
      fill="currentColor"
    >
      <path d={SPADE} />
    </svg>
  );
}

/** Home's mark: a spade on a square of felt, in the theme's table colours. */
export function SpadeMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid place-items-center rounded-[30%] bg-[radial-gradient(circle_at_30%_25%,var(--felt-hi),var(--felt)_55%,var(--felt-lo))] text-[var(--ctr-fg)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--felt-rim)_45%,transparent),0_18px_40px_-8px_color-mix(in_srgb,var(--felt)_70%,transparent)] ${className}`}
    >
      <Spade className="h-[62%] w-[62%] drop-shadow-[0_2px_3px_color-mix(in_srgb,var(--shade)_35%,transparent)]" />
    </span>
  );
}
