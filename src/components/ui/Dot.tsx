import { AvatarFill, type Face } from './Avatar';

export const Dot = ({ p, s = 28 }: { p: Face; s?: number }) => (
  <span
    className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full"
    style={{ width: s, height: s, background: p.color, fontSize: s * 0.57 }}
  >
    <AvatarFill p={p} />
  </span>
);
