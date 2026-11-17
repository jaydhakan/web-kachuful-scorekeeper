import { useEffect, useState } from 'react';
import { Podium, type PodiumStanding } from '@/components/ui/Podium';
import { revealPlan } from '@/components/ui/podiumReveal';
import { RankBoard, type BoardEntry } from '@/components/ui/RankBoard';
import { COLORS } from '@/people/avatars';
import EmojiRain from '../EmojiRain';
import { MomentPop } from '@/components/progression/MomentPop';
import type { PopCard } from '@/components/progression/popCard';
import type { LabEntry } from './registry';

const card = (emoji: string, who: string, what: string, tier?: PopCard['tier']): PopCard => ({
  k: what + who,
  emoji,
  text: `${who} · ${what}`,
  who,
  what,
  ...(tier ? { tier } : {}),
});

function Pops({ cards }: { cards: PopCard[] }) {
  const [pops, setPops] = useState<{ id: string; cards: PopCard[] } | null>(() => ({
    id: 'lab',
    cards,
  }));
  return (
    <div className="relative h-full">
      <MomentPop pops={pops} onDone={() => setPops(null)} />
    </div>
  );
}

const P = ['Riya', 'Dev', 'Asha', 'Kabir', 'Meera'].map((name, i) => ({
  id: name,
  name,
  emoji: ['🦊', '🐯', '🦉', '🐼', '🦁'][i],
  color: COLORS[i],
}));
const STANDINGS: PodiumStanding[] = P.slice(0, 4).map((p, i) => ({
  ...p,
  rank: i + 1,
  total: 120 - i * 17,
}));
function Ceremony() {
  const plan = revealPlan(STANDINGS.map((x) => x.rank));
  return (
    <div className="flex h-full flex-col justify-end p-4 [--pu:1px]">
      <Podium standings={STANDINGS} reveal={plan} />
    </div>
  );
}
const BOARD: BoardEntry[] = P.map((p, i) => ({
  id: p.id,
  who: p,
  rank: i + 1,
  n: 0.72 - i * 0.07,
  sub: `${12 - i} games`,
}));
function Board() {
  const [, force] = useState(0);
  useEffect(() => force(1), []);
  return (
    <div className="h-full overflow-auto p-4">
      <RankBoard
        entries={BOARD}
        show={(n) => `${Math.round(n * 100)}%`}
        onOpen={() => undefined}
        label={(r, n, v) => `${r} ${n} ${v}`}
        unrankedShort="—"
        unrankedTitle="Not ranked yet"
      />
    </div>
  );
}

const BIG = card('💯', 'Riya', 'Grand Slam', 'big');
const SMALLS = [
  card('🥷', 'Dev', 'Ninja'),
  card('🎰', 'Asha', 'High Roller'),
  card('🙃', 'Kabir', 'So Close', 'shame'),
  card('🎯', 'Meera', 'Sharpshooter'),
  card('🧊', 'Arjun', 'Ice Cold'),
];

function Rain() {
  const [on, setOn] = useState(true);
  return (
    <div className="relative h-full">
      {on && <EmojiRain emoji="🔥" onDone={() => setOn(false)} />}
    </div>
  );
}

export const PLATFORM: LabEntry[] = [
  {
    id: 'podium-ceremony',
    group: 'Platform',
    title: 'A2 Podium, ceremony',
    tier: 'moment',
    note: 'A winner screen: steps rise third to first, the light lands on first, the crown drops, confetti from the winner (the screen adds it). Reduced: all in place.',
    Demo: Ceremony,
  },
  {
    id: 'podium-board',
    group: 'Platform',
    title: 'A2 Podium, board',
    tier: 'beat',
    note: 'The first board of a visit: the same rise, a 600ms light and the crown; no title, about 2s.',
    Demo: Board,
  },
  {
    id: 'unlock-big',
    group: 'Platform',
    title: 'A1 Unlock card, big',
    tier: 'moment',
    note: 'Drops, turns from the card back, one sheen, 80 confetti, chime; read, then shrinks away. Tap skips. Reduced: face up, fades in and out.',
    Demo: () => <Pops cards={[BIG, SMALLS[0]]} />,
  },
  {
    id: 'unlock-small',
    group: 'Platform',
    title: 'A1 Small cards, 🙃, +N',
    tier: 'beat',
    note: 'Three small cards and "+2 more"; the 🙃 one is silver and wobbles. No sound unless Sounds is All.',
    Demo: () => <Pops cards={SMALLS} />,
  },
  {
    id: 'unlock-cap',
    group: 'Platform',
    title: 'A1 Three big in a hand',
    tier: 'moment',
    note: 'Two big cards play (two Moments a hand); the third joins the small cards.',
    Demo: () => (
      <Pops
        cards={[
          BIG,
          card('🧹', 'Dev & Asha', 'Clean Sweep', 'big'),
          card('🤯', 'Sun', 'Mind Meld', 'big'),
        ]}
      />
    ),
  },
  {
    id: 'rain',
    group: 'Platform',
    title: 'A3 Emoji rain',
    tier: 'beat',
    note: 'Online Spades: three players send the same reaction within 2s. 24 drops, 1.6s, behind the hand. Reduced: one big emoji, still.',
    Demo: Rain,
  },
];
