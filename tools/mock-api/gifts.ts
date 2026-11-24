/**
 * Gifts for the in-memory API (backend-requests.md §5): an item sent to someone in the sender's circle, paid from the
 * sender's balance and owned by the receiver at once. Opening only marks it shown, and posts the feed item.
 */
import type { Gift } from '../../src/sync/types';
import { priceOf } from '../../src/wardrobe/catalog';
import { tell } from './seatInvites';
import {
  balanceOf,
  grantItem,
  isUuid,
  ownedOf,
  sellable,
  spend,
  type RewardsKit,
} from './wardrobe';

interface Rec {
  id: string;
  itemId: string;
  v: number;
  from: string;
  to: string;
  sentAt: number;
  openedAt: number | null;
}

let kit: RewardsKit;
let gifts = new Map<string, Rec>();

/** The circle as the server's `circle_ids`: players the account made, everyone who shared a game with its player, and that player. */
function circleIds(userId: string, playerId: string | null): Set<string> {
  const ids = new Set(
    kit
      .players()
      .filter((p) => p.createdBy === userId)
      .map((p) => p.id),
  );
  if (playerId) {
    ids.add(playerId);
    for (const g of kit.seatings())
      if (g.playerIds.includes(playerId)) g.playerIds.forEach((p) => ids.add(p));
  }
  return ids;
}

const out = (r: Rec): Gift => ({
  id: r.id,
  item: { id: r.itemId, v: r.v },
  from: kit.summaryOf(r.from),
  to: kit.summaryOf(r.to),
  sentAt: r.sentAt,
  openedAt: r.openedAt,
});

const usersOf = (playerId: string) =>
  kit
    .players()
    .filter((p) => p.id === playerId && p.linkedUserId)
    .map((p) => p.linkedUserId!);

export function giftRoutes(k: RewardsKit) {
  kit = k;
  const { on, err } = k;

  on('POST', '/api/gifts', ({ me, body }) => {
    const pid = me!.playerId ? kit.resolve(me!.playerId) : null;
    if (!pid) throw err(409, 'no_player');
    if (!isUuid(body.giftId)) throw err(422, 'invalid', { fields: { giftId: 'a UUID' } });
    const prev = gifts.get(body.giftId);
    if (prev) {
      if (prev.from !== pid) throw err(409, 'id_conflict');
      return out(prev);
    }
    const [item, v] = sellable(body);
    const to = typeof body.toPlayerId === 'string' ? kit.resolve(body.toPlayerId) : '';
    if (!kit.players().some((p) => p.id === to && !p.mergedInto)) throw err(404, 'not_found');
    if (to === pid) throw err(422, 'self_gift');
    if (!circleIds(me!.id, pid).has(to)) throw err(422, 'not_in_circle');
    const theirs = ownedOf(to);
    if (theirs.some((o) => o.id === item.id && o.v === v)) throw err(409, 'already_owned');
    const price = priceOf(
      item,
      v,
      theirs.some((o) => o.id === item.id),
    )!;
    const bal = balanceOf(pid);
    if (bal.balance < price || bal.balance < 0)
      throw err(422, 'not_enough_sikke', { balance: Math.max(0, bal.balance), price });
    const r: Rec = {
      id: body.giftId,
      itemId: item.id,
      v,
      from: pid,
      to,
      sentAt: Date.now(),
      openedAt: null,
    };
    gifts.set(r.id, r);
    spend({ playerId: pid, kind: 'gift', itemId: item.id, v, amount: price, giftId: r.id });
    grantItem(to, item.id, v, 'gift', r.sentAt);
    const g = out(r);
    for (const u of usersOf(to)) tell(u, 'gift-received', { gift: g });
    return g;
  });

  on('GET', '/api/gifts/pending', ({ url }) => {
    const ids = (url.searchParams.get('players') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length > 12) throw err(422, 'invalid', { fields: { players: 'up to 12' } });
    const want = new Set(ids.map((id) => kit.resolve(id)));
    return {
      items: [...gifts.values()]
        .filter((r) => r.openedAt == null && want.has(r.to))
        .sort((a, b) => b.sentAt - a.sentAt)
        .map(out),
    };
  });

  on('POST', '/api/gifts/:id/open', ({ me, m }) => {
    const r = gifts.get(m[0]);
    if (!r) throw err(404, 'not_found');
    const pid = me!.playerId ? kit.resolve(me!.playerId) : null;
    // The receiver, or a table device whose circle has them.
    if (pid !== r.to && !circleIds(me!.id, pid).has(r.to)) throw err(403, 'forbidden');
    if (r.openedAt == null) {
      r.openedAt = Date.now();
      kit.feed({
        kind: 'gift',
        gameKind: undefined,
        player: kit.summaryOf(r.from),
        game: null,
        data: { giftId: r.id, itemId: r.itemId, v: r.v, to: kit.summaryOf(r.to) },
        createdAt: r.openedAt,
      });
    }
    return out(r);
  });

  on('GET', '/api/me/gifts', ({ me, url }) => {
    const pid = me!.playerId ? kit.resolve(me!.playerId) : null;
    const list = [...gifts.values()]
      .filter((r) => pid && (r.from === pid || r.to === pid))
      .sort((a, b) => b.sentAt - a.sentAt)
      .map(out);
    return kit.page(
      list,
      url.searchParams.get('cursor'),
      Number(url.searchParams.get('limit') ?? 50),
    );
  });
}

/** Forgets every gift (the server's seed()). */
export function resetGifts() {
  gifts = new Map();
}
