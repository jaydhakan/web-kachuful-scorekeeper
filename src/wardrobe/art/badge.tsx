import { cloth, LINE, NO_LINE, type ItemArt } from './types';

// Billa: pinned to the outfit's chest, left of centre as worn (the viewer's right).
const X = 68,
  Y = 84;

export const BADGE: Record<string, ItemArt> = {
  pehle_waale: {
    draw: () => (
      <>
        <circle
          cx={X}
          cy={Y}
          r={6}
          style={{ fill: 'var(--medal-gold)', stroke: 'var(--medal-gold-lo)', strokeWidth: 0.8 }}
        />
        <text
          x={X}
          y={Y + 2.6}
          textAnchor="middle"
          style={{ fill: cloth(2), fontSize: 7.5, fontWeight: 800 }}
        >
          1
        </text>
        <path
          d={`M${X - 4} ${Y + 5}L${X - 5} ${Y + 11}L${X - 2} ${Y + 9}ZM${X + 4} ${Y + 5}L${X + 5} ${Y + 11}L${X + 2} ${Y + 9}Z`}
          style={{ ...NO_LINE, fill: cloth(2) }}
        />
      </>
    ),
  },
  chai_cup: {
    draw: () => (
      <>
        <path
          d={`M${X - 5} ${Y - 3}H${X + 4}L${X + 3} ${Y + 5}H${X - 4}Z`}
          style={{ ...LINE, fill: cloth(5) }}
        />
        <path
          d={`M${X + 4} ${Y - 1}Q${X + 7.5} ${Y} ${X + 3.6} ${Y + 3}`}
          style={{ fill: 'none', stroke: 'var(--cloth-line)', strokeWidth: 0.8 }}
        />
        <path
          d={`M${X - 4.6} ${Y - 1}H${X + 3.6}`}
          style={{ fill: 'none', stroke: cloth(1), strokeWidth: 1.4 }}
        />
        <path
          d={`M${X - 1} ${Y - 5}Q${X - 2.5} ${Y - 7} ${X - 1} ${Y - 9}M${X + 1.5} ${Y - 5}Q${X} ${Y - 7} ${X + 1.5} ${Y - 9}`}
          style={{ fill: 'none', stroke: cloth(5), strokeWidth: 0.7, opacity: 0.8 }}
        />
      </>
    ),
  },
  spade_pin: {
    draw: () => (
      <>
        <circle
          cx={X}
          cy={Y}
          r={5.6}
          style={{ fill: 'var(--medal-silver)', stroke: 'var(--cloth-line)', strokeWidth: 0.6 }}
        />
        <path
          d={`M${X} ${Y - 3.6}C${X - 4} ${Y} ${X - 3.6} ${Y + 2.4} ${X - 1.2} ${Y + 2}L${X - 1.8} ${Y + 3.6}H${X + 1.8}L${X + 1.2} ${Y + 2}C${X + 3.6} ${Y + 2.4} ${X + 4} ${Y} ${X} ${Y - 3.6}Z`}
          style={{ ...NO_LINE, fill: cloth(6) }}
        />
      </>
    ),
  },
  lucky_seven: {
    draw: () => (
      <>
        <rect
          x={X - 5}
          y={Y - 6}
          width={10}
          height={12}
          rx={2}
          style={{ ...LINE, fill: cloth(4) }}
        />
        <text
          x={X}
          y={Y + 3.4}
          textAnchor="middle"
          style={{ fill: 'var(--medal-gold)', fontSize: 9, fontWeight: 800 }}
        >
          7
        </text>
      </>
    ),
  },
};
