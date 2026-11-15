import { seatInvites as s } from '@/strings/seatInvites';

// Bottom, left, top, right: seats run clockwise from yours, which always sits at the bottom.
const AT = ['left-1/2 top-[80%]', 'left-[20%] top-1/2', 'left-1/2 top-[20%]', 'left-[80%] top-1/2'];

/** A four-seat table from your side: who is seated, and your seat glowing. Spades seats only (`"0"`–`"3"`). */
export function SeatMap({ seat, taken }: { seat: number; taken: readonly number[] }) {
  const busy = new Set(taken);
  return (
    <span
      role="img"
      aria-label={s.seatMap(busy.size, !busy.has(seat))}
      className="relative h-[46px] w-[46px] shrink-0 rounded-full bg-[color-mix(in_srgb,var(--felt)_75%,transparent)] shadow-[inset_0_0_0_1px_var(--hairline)]"
    >
      {[0, 1, 2, 3].map((k) => {
        const at = (seat + k) % 4;
        const me = k === 0;
        return (
          <i
            key={k}
            className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${AT[k]} ${
              me
                ? 'bg-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_35%,transparent)]'
                : busy.has(at)
                  ? 'bg-[var(--tx2)]'
                  : 'bg-ov/20'
            }`}
          />
        );
      })}
    </span>
  );
}

/** A Spades seat ("0"–"3") as a number; null for any other game's seat. */
export const spadesSeat = (seat: string): number | null => (/^[0-3]$/.test(seat) ? +seat : null);
