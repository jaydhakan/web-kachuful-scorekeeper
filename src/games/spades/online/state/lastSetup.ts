import { storage } from '@/state/persistence';
import { STANDARD_RULES, rulesOk, type SpRules } from '../../domain';
import { SP_KEYS } from '../../state/keys';

/** The host's last online rules (`spades.lastSetup`), or the standard ones; anything unreadable falls back. */
export function loadLastRules(): SpRules {
  const r = storage.get<SpRules | null>(SP_KEYS.lastSetup, null);
  return rulesOk(r) ? { ...STANDARD_RULES, ...r } : { ...STANDARD_RULES };
}

export const saveLastRules = (r: SpRules) => void storage.set(SP_KEYS.lastSetup, r);
