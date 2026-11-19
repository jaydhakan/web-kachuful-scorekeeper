import '@/games/spades/spades.css';
import '@/games/spades/ui/play.css';
import { useEffect, useRef, useState } from 'react';
import type { Seat } from '@/games/spades/domain/types';
import { Felt } from '@/games/spades/online/table/Felt';
import { Boston, BostonMoment } from '@/games/spades/ui/Boston';
import type { NilState, SeatProps } from '@/games/spades/ui/Seat';
import { COLORS } from '@/people/avatars';
import { sheen } from '../stamp';
import { reducedMotion } from '../waapi';
import type { LabEntry } from './registry';

const NAMES = ['You', 'Dev', 'Riya', 'Asha'];
const seat = (x: Seat, o: Partial<SeatProps> = {}): SeatProps & { place: 0 | 1 | 2 | 3 } => ({
  seat: x,
  place: x as 0 | 1 | 2 | 3,
  face: { emoji: ['🦊', '🐯', '🦉', '🐼'][x], color: COLORS[x] },
  name: NAMES[x],
  me: x === 0,
  pill: '3 / 4',
  pillNil: false,
  took: 0,
  aria: NAMES[x],
  cardsLeft: 5,
  dealer: x === 3,
  turn: false,
  away: false,
  nil: 'none' as NilState,
  timer: null,
  invited: false,
  bubble: null,
  ...o,
});

/** A felt with four seats, for the table's moments. */
function Table({
  children,
  crack = null,
  broken = false,
  seats = [0, 1, 2, 3].map((x) => seat(x as Seat)),
}: {
  children?: React.ReactNode;
  crack?: number | null;
  broken?: boolean;
  seats?: ReturnType<typeof seat>[];
}) {
  const root = useRef<HTMLDivElement>(null),
    felt = useRef<HTMLDivElement>(null);
  return (
    <div ref={root} data-table="sp" className="absolute inset-0 py-8">
      <Felt
        root={root}
        feltRef={felt}
        seats={seats}
        trick={null}
        broken={broken}
        crack={crack}
        onLastTrick={() => undefined}
        lastTrickLabel=""
        centreText={null}
        showChip
      >
        {children}
      </Felt>
    </div>
  );
}

function BostonOnline() {
  const [on, setOn] = useState<{ from: { x: number; y: number }[]; ac: AbortController } | null>(
    null,
  );
  useEffect(() => {
    // The partners' avatars, measured once the felt has laid out.
    const id = requestAnimationFrame(() => {
      const from = [0, 2].flatMap((x) => {
        const r = document
          .querySelector(`[data-lab-stage] [data-seat="${x}"] [data-seat-avatar]`)
          ?.getBoundingClientRect();
        return r ? [{ x: r.left + r.width / 2, y: r.top + r.height / 2 }] : [];
      });
      setOn({ from, ac: new AbortController() });
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <Table>
      {on && (
        <Boston
          team="a"
          name="Sun"
          them={false}
          from={on.from}
          reduced={reducedMotion()}
          signal={on.ac.signal}
          onSkip={() => on.ac.abort()}
          onDone={() => undefined}
        />
      )}
    </Table>
  );
}

function BlindNil() {
  const hand = useRef<HTMLDivElement>(null);
  useEffect(() => sheen(hand.current, { delay: 300 }).cancel, []);
  return (
    <div className="absolute inset-0">
      <Table
        seats={[0, 1, 2, 3].map((x) =>
          seat(
            x as Seat,
            x === 2 ? { nil: 'live', blind: true, pill: 'NIL · 0', pillNil: true } : {},
          ),
        )}
      />
      <div
        ref={hand}
        data-hand
        className="absolute inset-x-6 bottom-6 flex h-24 justify-center gap-1 overflow-hidden rounded-xl"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} className="card-art h-24 w-16 rounded-lg bg-card-back" />
        ))}
      </div>
    </div>
  );
}

function Crack() {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setBroken(true), 300);
    return () => clearTimeout(id);
  }, []);
  return <Table crack={broken ? 7 : null} broken={broken} />;
}

export const SPADES: LabEntry[] = [
  {
    id: 'boston',
    group: 'Spades',
    title: 'S1 Boston, online',
    tier: 'moment',
    note: 'The 13 tricks fly out of the partners (You, Riya) into one stack; the glow; BOSTON stamps above the stack and confetti. Reduced: the stamp and line.',
    Demo: BostonOnline,
  },
  {
    id: 'boston-scorekeeper',
    group: 'Spades',
    title: 'S1 Boston, scorekeeper',
    tier: 'moment',
    note: 'On the hand summary: the stamp and confetti only.',
    Demo: () => (
      <div className="relative h-full">
        <BostonMoment id="lab:boston" team="b" name="Moon" onEnd={() => undefined} />
      </div>
    ),
  },
  {
    id: 'blind-nil',
    group: 'Spades',
    title: 'S2 Blind Nil declared',
    tier: 'beat',
    note: 'Riya has the outer ring for the hand; one light crosses the declarer’s face-down hand; one heartbeat.',
    Demo: BlindNil,
  },
  {
    id: 'crack',
    group: 'Spades',
    title: 'S4 Spades broken',
    tier: 'beat',
    note: 'The felt shakes once (3px, 200ms), the chip breaks into shards, the crack and banner. Reduced: the banner, still.',
    Demo: Crack,
  },
];
