import type { Player } from '@/domain';

export const Dot = ({ p, s = 28 }: { p: Pick<Player, 'color' | 'emoji'>; s?: number }) => (
  <span
    className="inline-grid shrink-0 place-items-center rounded-full"
    style={{ width: s, height: s, background: p.color, fontSize: s * 0.57 }}
  >
    {p.emoji}
  </span>
);
