import { dealerFor, defaultRules, type KtGame, type KtHand } from '@/games/kaali-teeri/domain';
import { COLORS } from '@/people/avatars';

const NAMES = ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev', 'Ishaan', 'Anaya', 'Vihaan', 'Saanvi'];

/** A game of `n` (4–9) at hand 1, dealer seat 0 so seat 1 (Riya) speaks first; `hand` sets its phase. */
export function testGame(n: number, hand: Partial<KtHand> = {}): KtGame {
  const g: KtGame = {
    kind: 'kaali-teeri',
    schemaVersion: 1,
    id: 't',
    syncId: 's',
    rev: 1,
    createdAt: 0,
    updatedAt: 0,
    players: NAMES.slice(0, n).map((name, i) => ({
      id: 'p' + i,
      name,
      emoji: '🙂',
      color: COLORS[i % COLORS.length],
    })),
    firstDealerIndex: 0,
    direction: 'cw',
    rules: defaultRules(n),
    hands: [],
    status: 'active',
    ui: { view: 'hand' },
  };
  g.hands.push({
    index: 0,
    dealerIndex: dealerFor(g, 0),
    phase: 'bidding',
    mode: 'quick',
    calls: [],
    bidder: null,
    bid: null,
    trump: null,
    called: [],
    playedBy: [],
    teamPoints: null,
    countedBy: null,
    ...hand,
  });
  return g;
}
