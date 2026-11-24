/** Ishaara's table banter (REWARDS-PLAN §6.7): friendly roast, about the turn only, never mean. */
import type { IshBanterKind } from '@/games/ishaara/domain/banter';
import type { Mark } from '@/progression/banter';

type Line = (who: string) => string;

const medal = (t: string): Partial<Record<IshBanterKind, Line[]>> => ({
  trapped: [
    () => `${t} ki team trap mein phas gayi 💣`,
    (w) => `${w}, yeh trap tha! 😬`,
    () => `Ishaara samjha, par galat samjha`,
  ],
  wrong: [
    () => `${t} ki team ne doosron ka kaam kar diya 🙃`,
    (w) => `${w}, yeh word unka tha`,
    () => `Ghar ka patta, doosre ke ghar`,
  ],
  bigClue: [
    () => `${t} ka ishaara, teen ek saath! 🎯`,
    (w) => `${w} ne ek clue mein kamaal kar diya`,
    () => `${t} hi keh de!`,
  ],
  cleanTurn: [() => `${t} ki team, ek bhi galti nahi ✨`, (w) => `${w} ka ishaara seedha dil pe`],
});

const POOLS: Record<Mark, Partial<Record<IshBanterKind, Line[]>>> = {
  gold: medal('Badshah'),
  silver: medal('Wazir'),
  bronze: medal('Senapati'),
  sitara: medal('Aaj ka Sitara'),
  legend: {
    bigClue: [
      () => 'Legend ka ishaara, Legend ki pehchaan',
      (w) => `${w} ne dikha diya kyun Legend hai`,
    ],
    cleanTurn: [() => 'Legend ho toh aise'],
  },
};

export const poolFor = (kind: IshBanterKind, mark: Mark): Line[] => POOLS[mark][kind] ?? [];
