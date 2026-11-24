/** Spades' table banter (REWARDS-PLAN §6.7): friendly roast, about the hand only, never mean. */
import type { SpBanterKind } from '@/games/spades/domain/banter';
import type { Mark } from '@/progression/banter';

type Line = (who: string) => string;

const medal = (t: string): Partial<Record<SpBanterKind, Line[]>> => ({
  nilBroken: [
    () => `${t} ka Nil toot gaya 💥`,
    (w) => `${w}, Nil bola tha na? 🙃`,
    () => `Nil ka vaada, aur ek haath aa gaya`,
    () => `${t} se Nil nahi sambhla`,
  ],
  set: [
    () => `${t} ki team set ho gayi 😬`,
    (w) => `${w} ka contract adhoora reh gaya`,
    () => `Boli badi thi, haath chhote`,
    () => `${t} bhi set? Aaj kya ho raha hai 👀`,
  ],
  bagged: [
    () => `${t} ke bags bhar gaye 🎒`,
    (w) => `${w}, itne overtricks? 100 gaye`,
    () => `Bags ka bojh ${t} pe bhi`,
  ],
  nilMade: [
    () => `${t} ka Nil pakka 🧊`,
    (w) => `${w} ne ek bhi haath nahi liya`,
    () => `Nil ho toh aise`,
  ],
  bigMake: [
    () => `${t} hi keh de! 👑`,
    (w) => `${w} ki team ne bada contract bana liya`,
    () => `Badi boli, poori kar di`,
  ],
  setThem: [
    () => `${t} ne saamne waalon ko set kar diya 🛡️`,
    (w) => `${w} ki defence kamaal`,
    () => `${t} ke saamne contract nahi chala`,
  ],
});

const POOLS: Record<Mark, Partial<Record<SpBanterKind, Line[]>>> = {
  gold: medal('Badshah'),
  silver: medal('Wazir'),
  bronze: medal('Senapati'),
  sitara: medal('Aaj ka Sitara'),
  legend: {
    nilMade: [() => 'Legend ka Nil, Legend ki jeet', (w) => `${w} ka anubhav dikh gaya`],
    bigMake: [() => 'Legend ho toh aise', (w) => `${w} ne dikha diya kyun Legend hai`],
    setThem: [() => 'Legend ke saamne contract nahi chalta'],
  },
};

export const poolFor = (kind: SpBanterKind, mark: Mark): Line[] => POOLS[mark][kind] ?? [];
