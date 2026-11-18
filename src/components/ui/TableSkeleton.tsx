/**
 * The outline of a table screen while it waits on the server, so the screen fills in place instead of a spinner on
 * bare background: `felt` (header, team bar, a felt with four seats, and a hand unless `hand` is false: a spectator
 * has none) or `grid` (header and a 5x5 board).
 * Shapes only, in the theme's own materials; a soft pulse, none under reduced motion.
 */
export function TableSkeleton({
  kind,
  label,
  hand = true,
}: {
  kind: 'felt' | 'grid';
  label: string;
  hand?: boolean;
}) {
  const bar = 'sk-pulse block rounded-full bg-ov/[.08]';
  return (
    <div
      aria-busy="true"
      className="app-root scr-bg absolute inset-0 flex flex-col gap-3 pb-[max(1rem,var(--sab))] pl-[max(1rem,var(--sal))] pr-[max(1rem,var(--sar))] pt-[calc(var(--sat)+0.75rem)]"
    >
      <p role="status" className="sr-only">
        {label}
      </p>
      <div aria-hidden className="flex h-11 shrink-0 items-center justify-between">
        <i className={`${bar} h-11 w-11`} />
        <i className={`${bar} h-4 w-32`} />
        <i className={`${bar} h-11 w-11`} />
      </div>
      {kind === 'felt' ? (
        <>
          <i aria-hidden className={`${bar} h-10 w-full shrink-0 rounded-2xl`} />
          <div aria-hidden className="glass sk-pulse relative min-h-0 flex-1">
            {[
              'left-1/2 top-[12%]',
              'left-[14%] top-1/2',
              'left-[86%] top-1/2',
              'left-1/2 top-[88%]',
            ].map((at) => (
              <i
                key={at}
                className={`absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ov/[.1] ${at}`}
              />
            ))}
          </div>
          <div
            aria-hidden
            className={`flex shrink-0 items-end justify-center ${hand ? 'h-[140px]' : 'hidden'}`}
          >
            {Array.from({ length: 7 }, (_, i) => (
              <i
                key={i}
                className="sk-pulse -mx-2.5 block h-[104px] w-[68px] rounded-[8px] bg-ov/[.08] shadow-[0_0_0_1px_var(--hairline)]"
                style={{
                  transform: `rotate(${(i - 3) * 5}deg) translateY(${Math.abs(i - 3) * 4}px)`,
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div
          aria-hidden
          className="mx-auto grid w-full max-w-[40rem] flex-1 grid-cols-5 content-start gap-2"
        >
          {Array.from({ length: 25 }, (_, i) => (
            <i key={i} className="glass sk-pulse block aspect-[4/3] rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
