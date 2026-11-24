/** Kaali Teeri's table banter (REWARDS-PLAN §6.7): friendly roast, about the hand only, never mean. */
import type { KtBanterKind } from '@/games/kaali-teeri/domain/banter';
import type { Mark } from '@/progression/banter';

type Line = (who: string, other: string) => string;

const title: Record<Mark, string> = {
  gold: 'Badshah',
  silver: 'Wazir',
  bronze: 'Senapati',
  sitara: 'Aaj ka Sitara',
  legend: 'Legend',
};

/** Lines about a medallist; `{t}` reads their title. */
const medal = (t: string): Partial<Record<KtBanterKind, Line[]>> => ({
  swept: [
    () => `${t} ka ek bhi point nahi! Poora saaf 🧹`,
    (w) => `${w} ki boli, aur haath khaali 😬`,
    () => `Defenders ne ${t} ko zero pe rok diya`,
    () => `Yeh toh clean sweep ho gaya, ${t} ji`,
  ],
  bidFail: [
    () => `${t} ki boli kam pad gayi 👀`,
    (w) => `${w}, itna bada daav? Agli baar 🙃`,
    () => `${t} bhi chook gaye`,
    () => `Boli lagayi, par baat bani nahi`,
  ],
  partnerFail: [
    (w) => `${t} ${w} saath the, phir bhi nahi bana`,
    () => `${t} ki team aaj thodi dheeli`,
    () => `Partner bhi ${t}, phir bhi chook`,
    (w) => `${w} ne patta diya, par points nahi aaye`,
  ],
  sweep: [
    () => `${t} ne poora haath saaf kar diya 👑`,
    (w) => `${w} ka clean sweep! Kya baat hai`,
    () => `Ek bhi point nahi chhoda`,
    () => `${t} ho toh aise`,
  ],
  bigMake: [
    () => `${t} hi keh de!`,
    (w) => `${w} ki badi boli, aur bana bhi li 💪`,
    () => `Bada daav, badi jeet`,
    () => `${t} ka rob hai aaj`,
  ],
  stopped: [
    (w) => `${w} ne boli tod di 🛡️`,
    () => `${t} ne defend kar liya`,
    () => `${t} ke saamne boli nahi chali`,
    () => `Defence mein bhi ${t}`,
  ],
  passed: [
    (_w, o) => `${t} ki nazar ${o} ki kursi pe 👀`,
    (w, o) => `${w} ne ${o} ko peeche chhod diya`,
    () => `${t} upar chadh raha hai`,
    (w) => `${w} aaj full form mein`,
  ],
});

const POOLS: Record<Mark, Partial<Record<KtBanterKind, Line[]>>> = {
  gold: medal(title.gold),
  silver: medal(title.silver),
  bronze: medal(title.bronze),
  sitara: medal(title.sitara),
  legend: {
    sweep: [() => 'Legend ho toh aise', (w) => `${w} ne dikha diya kyun Legend hai`],
    bigMake: [() => 'Legend ki boli, Legend ki jeet', (w) => `${w} ka anubhav bol raha hai`],
    stopped: [() => 'Legend ne boli rok di', (w) => `${w} ke saamne nahi chalti`],
  },
};

export const poolFor = (kind: KtBanterKind, mark: Mark): Line[] => POOLS[mark][kind] ?? [];
