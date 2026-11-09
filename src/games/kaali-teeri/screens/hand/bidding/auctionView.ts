import {
  deckTotal,
  speakingOrder,
  validCall,
  type Call,
  type KtGame,
  type KtHand,
} from '@/games/kaali-teeri/domain';
import { auctionOf, minNextBid } from '@/games/kaali-teeri/state/select';
import { ktBidding } from '@/games/kaali-teeri/strings/bidding';

/** The log shows the latest calls only; the table already shows where everyone stands. */
export const LOG_SHOWN = 8;

/** One call as the log says it: "Riya 185", "Kabir pass", "Dev takes 150". */
export const callText = (c: Call, name: string) => {
  const a = ktBidding.auction;
  return 'pass' in c
    ? a.logPass(name)
    : 'bid' in c
      ? a.logBid(name, c.bid)
      : a.logForced(name, c.forced);
};

/** What the auction screens (phone and desk) derive from the hand: the table's calls, whose turn, the log. */
export function auctionView(g: KtGame, h: KtHand) {
  const st = auctionOf(g, h);
  const min = minNextBid(g);
  const max = deckTotal(g.rules.decks);
  const order = speakingOrder(g, h.index);
  const idx = (id: string | null) => g.players.findIndex((p) => p.id === id);
  const nameOf = (id: string | null) => g.players[idx(id)]?.name ?? '';
  const last = new Map<string, Call>();
  for (const c of h.calls) last.set(c.playerId, c);
  const bids: Record<string, number> = {};
  const passed: number[] = [];
  for (const [id, c] of last) {
    if ('pass' in c) passed.push(idx(id));
    else bids[id] = 'bid' in c ? c.bid : c.forced;
  }
  const speaker = st.toSpeak ? g.players[idx(st.toSpeak)] : null;
  const canPass =
    !!st.toSpeak && validCall(h.calls, order, g.rules, { playerId: st.toSpeak, pass: true });
  return {
    st,
    min,
    max,
    order,
    idx,
    nameOf,
    bids,
    passed,
    speaker,
    canPass,
    shown: h.calls.slice(-LOG_SHOWN),
  };
}
