import { useId, type CSSProperties, type ReactNode } from 'react';
import type { GameId } from '../route';

// Every colour is a theme token, so the art follows the theme; a deck-art theme paints the backs through --art-back.
const fill = (v: string): CSSProperties => ({ fill: `var(--${v})` });
const stroke = (v: string): CSSProperties => ({ stroke: `var(--${v})` });
const stop = (v: string): CSSProperties => ({ stopColor: `var(--${v})` });

const SPADE =
  'M50 6C62 25 93 39 93 62C93 76 81 85 68 85C61 85 56 82 53 78C54 85 57 90 64 95L36 95C43 90 46 85 47 78C44 82 39 85 32 85C19 85 7 76 7 62C7 39 38 25 50 6Z';

function Frame({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}bg`} cx="0.5" cy="0.35" r="0.9">
          <stop offset="0" style={stop('surface-2')} />
          <stop offset="1" style={stop('bg')} />
        </radialGradient>
        <radialGradient id={`${id}felt`} cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" style={stop('felt-hi')} />
          <stop offset="0.55" style={stop('felt')} />
          <stop offset="1" style={stop('felt-lo')} />
        </radialGradient>
        <linearGradient id={`${id}gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop('medal-gold-hi')} />
          <stop offset="1" style={stop('medal-gold-lo')} />
        </linearGradient>
        <linearGradient id={`${id}back`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop('card-back-a')} />
          <stop offset="1" style={stop('card-back-b')} />
        </linearGradient>
      </defs>
      <rect width="640" height="400" fill={`url(#${id}bg)`} />
      {children}
    </>
  );
}

function Kachuful({ id }: { id: string }) {
  const seats: [number, number, number][] = [
    [320, 334, 5],
    [128, 250, 2],
    [190, 96, 3],
    [450, 96, 4],
    [512, 250, 5],
  ];
  return (
    <Frame id={id}>
      <ellipse cx="320" cy="214" rx="214" ry="128" style={fill('shade')} opacity=".25" />
      <ellipse
        cx="320"
        cy="206"
        rx="206"
        ry="122"
        fill={`url(#${id}felt)`}
        style={stroke('felt-rim')}
        strokeWidth="4"
      />
      <ellipse cx="300" cy="150" rx="150" ry="52" style={fill('ov')} opacity=".07" />
      <ellipse
        cx="320"
        cy="206"
        rx="150"
        ry="84"
        fill="none"
        style={stroke('felt-rim')}
        strokeOpacity=".7"
        strokeWidth="4"
        strokeDasharray="10 12"
      />
      <path d={SPADE} fill={`url(#${id}gold)`} transform="translate(275 150) scale(.9)" />
      {seats.map(([x, y], k) => (
        <circle
          key={k}
          cx={x}
          cy={y}
          r={k ? 28 : 30}
          style={{ ...fill(`seat-${k + 1}`), ...(k ? {} : stroke('medal-gold')) }}
          strokeWidth={k ? 0 : 5}
        />
      ))}
    </Frame>
  );
}

/** A face-down card; the theme's real back covers the stripes when it has one. */
function Back({ id, x, turn }: { id: string; x: number; turn: number }) {
  return (
    <g transform={`rotate(${turn} ${x + 64} 300)`}>
      <rect
        x={x}
        y="100"
        width="128"
        height="180"
        rx="10"
        fill={`url(#${id}back)`}
        style={stroke('card-back-edge')}
        strokeWidth="4"
      />
      <foreignObject x={x} y="100" width="128" height="180">
        <div
          className="h-full w-full rounded-[10px]"
          style={{ background: 'var(--art-back) center / cover no-repeat' }}
        />
      </foreignObject>
      <circle cx={x + 64} cy="190" r="26" style={fill('card-bg')} />
      <text
        x={x + 64}
        y="201"
        textAnchor="middle"
        fontSize="32"
        fontWeight="700"
        style={{ ...fill('card-fg'), fontFamily: 'var(--font-body)' }}
      >
        ?
      </text>
    </g>
  );
}

function KaaliTeeri({ id }: { id: string }) {
  return (
    <Frame id={id}>
      <rect
        x="56"
        y="70"
        width="528"
        height="290"
        rx="145"
        fill={`url(#${id}felt)`}
        style={stroke('felt-rim')}
        strokeWidth="4"
      />
      <Back id={id} x={150} turn={-16} />
      <Back id={id} x={362} turn={16} />
      <g transform="rotate(-3 320 230)">
        <rect
          x="250"
          y="80"
          width="140"
          height="200"
          rx="10"
          style={{ ...fill('card-bg'), ...stroke('card-fg') }}
          strokeWidth="4"
        />
        <text
          x="268"
          y="122"
          fontSize="34"
          fontWeight="700"
          style={{ ...fill('card-fg'), fontFamily: 'var(--font-body)' }}
        >
          3
        </text>
        <path d={SPADE} style={fill('card-fg')} transform="translate(296 160) scale(.48)" />
        <path d={SPADE} style={fill('card-fg')} transform="translate(332 100) scale(.24)" />
        <path d={SPADE} style={fill('card-fg')} transform="translate(332 228) scale(.24)" />
      </g>
    </Frame>
  );
}

// A 5 × 3 board of word cards: each kind in its own token pair.
const BOARD = [
  'blank',
  'sun',
  'word',
  'moon',
  'word',
  'word',
  'sun',
  'blank',
  'word',
  'moon',
  'word',
  'trap',
  'word',
  'word',
  'sun',
];

function Ishaara({ id }: { id: string }) {
  const paint = (k: string): [string, string] =>
    k === 'sun'
      ? ['team-sun', 'team-sun-ink']
      : k === 'moon'
        ? ['team-moon', 'team-moon-ink']
        : k === 'trap'
          ? ['word-trap', 'word-trap-ink']
          : k === 'blank'
            ? ['word-blank', 'word-blank-ink']
            : ['word-card', 'word-card-ink'];
  return (
    <Frame id={id}>
      <rect x="244" y="40" width="152" height="60" rx="16" style={fill('word-card')} />
      <path d="M300 99L314 118L326 99Z" style={fill('word-card')} />
      <rect x="268" y="64" width="70" height="10" rx="5" style={fill('team-moon')} />
      <circle cx="360" cy="69" r="8" style={fill('team-sun')} />
      {BOARD.map((k, i) => {
        const x = 60 + (i % 5) * 106,
          y = 140 + Math.floor(i / 5) * 72;
        const [bg, ink] = paint(k);
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width="96"
              height="58"
              rx="8"
              style={{ ...fill(bg), ...stroke('word-edge') }}
              strokeWidth="2"
            />
            {k === 'sun' && <circle cx={x + 48} cy={y + 29} r="12" style={fill(ink)} />}
            {k === 'moon' && (
              <path
                d={`M${x + 52} ${y + 15}a14 14 0 1 0 0 28a11 14 0 1 1 0-28Z`}
                style={fill(ink)}
              />
            )}
            {k === 'trap' && (
              <path
                d={`M${x + 38} ${y + 19}l20 20M${x + 58} ${y + 19}l-20 20`}
                style={stroke(ink)}
                strokeWidth="6"
                strokeLinecap="round"
              />
            )}
            {k === 'blank' && (
              <path
                d={`M${x + 14} ${y + 46}l26-34M${x + 40} ${y + 46}l26-34M${x + 66} ${y + 46}l20-26`}
                style={stroke(ink)}
                strokeOpacity=".35"
                strokeWidth="5"
              />
            )}
            {k === 'word' && (
              <rect
                x={x + 24}
                y={y + 26}
                width="48"
                height="6"
                rx="3"
                style={fill(ink)}
                opacity=".35"
              />
            )}
          </g>
        );
      })}
    </Frame>
  );
}

const ART: Record<GameId, (p: { id: string }) => ReactNode> = {
  kachuful: Kachuful,
  'kaali-teeri': KaaliTeeri,
  ishaara: Ishaara,
};

/** A game's landing tile, 16:10, drawn from the theme's tokens; `slice` crops it to a square on the phone. */
export function TileArt({ game, className = '' }: { game: GameId; className?: string }) {
  const id = 't' + useId().replace(/:/g, '');
  const Art = ART[game];
  return (
    <svg
      viewBox="0 0 640 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      className={className}
    >
      <Art id={id} />
    </svg>
  );
}

/** The game's small icon for the resume rows: its accent on a dark tile. */
export function GameIcon({ game }: { game: GameId }) {
  const accent = { color: `var(--game-${game})` };
  return (
    <span
      aria-hidden
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-sm)] bg-[var(--surface-2)] shadow-[inset_0_0_0_1px_var(--hairline-2)]"
      style={accent}
    >
      {game === 'kaali-teeri' ? (
        <span className="text-22 font-bold leading-none">3</span>
      ) : (
        <svg viewBox="0 0 100 100" className="h-6 w-6" fill="currentColor">
          {game === 'kachuful' ? (
            <path d={SPADE} />
          ) : (
            <path d="M14 18h72a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H48l-18 16V70H14a8 8 0 0 1-8-8V26a8 8 0 0 1 8-8Z" />
          )}
        </svg>
      )}
    </span>
  );
}
