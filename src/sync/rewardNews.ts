import { useSyncExternalStore } from 'react';
import type { Gift, MilestoneOut } from './types';

/**
 * Gifts and milestones the server just told this phone about (backend-requests §5, §6): gifts from the user stream,
 * milestones from this device's own upload (`status.milestones`) and from the stream on every other phone.
 */
export interface MilestoneNews extends MilestoneOut {
  /** From this device's own upload: its table can show it at once. */
  local: boolean;
}

interface RewardNews {
  /** Gifts received while the app was open, newest first; dropped once shown. */
  gifts: Gift[];
  /** Milestones, newest first, one per key. */
  milestones: MilestoneNews[];
}

const EMPTY: RewardNews = { gifts: [], milestones: [] };
let cur: RewardNews = EMPTY;
/** Every milestone key and gift id already put, so a late duplicate never brings back one already shown. */
let seen = new Set<string>();
const subs = new Set<() => void>();
const set = (next: RewardNews) => {
  cur = next;
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

export function putGift(g: Gift) {
  if (seen.has(g.id)) return;
  seen.add(g.id);
  set({ ...cur, gifts: [g, ...cur.gifts.filter((x) => x.id !== g.id)].slice(0, 20) });
}
export const dropGift = (id: string) =>
  set({ ...cur, gifts: cur.gifts.filter((x) => x.id !== id) });

/** The upload's and the stream's word can both arrive for one milestone: the first one is kept. */
export function putMilestones(ms: readonly MilestoneOut[], local: boolean) {
  const fresh = ms.filter((m) => !seen.has(m.key));
  if (!fresh.length) return;
  fresh.forEach((m) => seen.add(m.key));
  set({
    ...cur,
    milestones: [...fresh.map((m) => ({ ...m, local })), ...cur.milestones].slice(0, 20),
  });
}
export const dropMilestone = (key: string) =>
  set({ ...cur, milestones: cur.milestones.filter((x) => x.key !== key) });
export function clearRewardNews() {
  seen = new Set();
  set(EMPTY);
}

export const rewardNews = () => cur;
export const useRewardNews = () => useSyncExternalStore(subscribe, rewardNews);
export const useGiftNews = () => useSyncExternalStore(subscribe, () => cur.gifts);
export const useMilestoneNews = () => useSyncExternalStore(subscribe, () => cur.milestones);
