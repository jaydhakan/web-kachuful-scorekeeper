import { useState } from 'react';
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

const BIG = card('💯', 'Riya', 'Grand Slam', 'big');
const SMALLS = [
  card('🥷', 'Dev', 'Ninja'),
  card('🎰', 'Asha', 'High Roller'),
  card('🙃', 'Kabir', 'So Close', 'shame'),
  card('🎯', 'Meera', 'Sharpshooter'),
  card('🧊', 'Arjun', 'Ice Cold'),
];

export const PLATFORM: LabEntry[] = [
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
];
