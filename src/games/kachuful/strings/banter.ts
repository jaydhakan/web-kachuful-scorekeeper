/** Kachuful's table banter (REWARDS-PLAN §6.7): friendly roast, about the round only, never mean. */
import type { BanterKind, Mark } from '@/games/kachuful/domain';

type Line = (who: string, other: string) => string;

/** How a holder is named in a line: their title, or the Kursi/Sitara's own phrase. */
export const markName: Record<Mark, (name: string) => string> = {
  gold: (n) => `Badshah ${n}`,
  silver: (n) => `Wazir ${n}`,
  bronze: (n) => `Senapati ${n}`,
  kursi: (n) => `Kursi wale ${n}`,
  sitara: (n) => `Aaj ka Sitara ${n}`,
  legend: (n) => `Legend ${n}`,
};

/** Lines about the Badshah (the first, most-heard set). */
const gold: Partial<Record<BanterKind, Line[]>> = {
  soleMiss: [
    () => 'Poori table ne kar diya, sirf Badshah reh gaye 😬',
    (w) => `Sab ne bana liya. ${w}? Agli baar 🙃`,
    () => 'Ek hi chooka, aur woh bhi takht se',
    () => 'Badshah ki aaj chhutti hai kya? 😬',
  ],
  outbid: [
    (_w, o) => `${o} ne Badshah ko pachaad diya!`,
    (w, o) => `${o} ka bada daav chal gaya, ${w} ka nahi`,
    (_w, o) => `Aaj ${o} ki chal rahi hai 👀`,
    (_w, o) => `${o} 1, Badshah 0`,
  ],
  missTwice: [
    (w) => `${w} ka sona aaj peetal lag raha hai`,
    () => 'Do baar lagaatar? Takht hil raha hai…',
    () => 'Badshah ka bura daur chal raha hai 😅',
    (w) => `${w}, sab theek hai na?`,
  ],
  miss: [
    () => 'Badshah bhi chook gaye 👀',
    () => 'Takht thoda hil raha hai…',
    () => 'Arre Badshah, yeh kya hua?',
    () => 'Gold thoda pighal raha hai…',
  ],
  hooked: [
    () => 'Hook ne Badshah ko bhi nahi chhoda 🪝',
    () => 'Hook kisi ka nahi hota, Badshah ka bhi nahi 🪝',
    () => 'Dealer Badshah, aur hook ne pakad liya 🪝',
    () => 'Takht pe bhi hook lagta hai 🪝',
  ],
  bigMake: [
    () => 'Badshah hi keh de!',
    () => 'Badshah ho toh aise 👑',
    () => 'Isliye #1 hain 👑',
    (w) => `${w} ne dikha diya kaun Badshah hai`,
  ],
  soleMake: [
    () => 'Ek akela Badshah',
    () => 'Sab doob gaye, Badshah tair gaye 👑',
    (w) => `Poori table mein sirf ${w}`,
    () => 'Takht pe akele hi kaafi hain',
  ],
  nilMake: [
    () => 'Chupke se kaam ho gaya',
    () => 'Zero ka daav, poora kaam 🤫',
    () => 'Badshah ne kuch nahi maanga, aur mil gaya',
    () => 'Shaanti se, Badshah style',
  ],
};

/** Lines about the Kursi, Sitara and Legend once those marks ship; the medals' `passed` line. */
const others: Partial<Record<Mark, Partial<Record<BanterKind, Line[]>>>> = {
  kursi: {
    soleMiss: [
      () => 'Kursi pe baithe baithe so gaye?',
      (w) => `Sab ne kiya, ${w} ki Kursi hil gayi`,
    ],
    outbid: [(_w, o) => `${o} ki nazar Kursi pe hai 👀`, (_w, o) => `${o} Kursi ke kareeb`],
    missTwice: [() => 'Kursi ki taangein hil rahi hain', (w) => `${w}, Kursi sambhalo`],
    miss: [() => 'Kursi hil rahi hai 🪑', () => 'Kursi thodi dheeli lag rahi hai'],
    hooked: [() => 'Hook ne Kursi ko bhi kheencha 🪝', () => 'Kursi pe hook 🪝'],
    bigMake: [() => 'Kursi pakki', () => 'Kursi pe jam ke baithe hain 🪑'],
    soleMake: [() => 'Kursi wale hi bache', () => 'Ek Kursi, ek hi khiladi'],
    nilMake: [() => 'Kursi pe chupchaap', () => 'Zero se Kursi bachi'],
  },
  sitara: {
    soleMiss: [() => 'Aaj ka Sitara thoda dhundhla', () => 'Sitare pe baadal ☁️'],
    outbid: [(_w, o) => `${o} chamak rahe hain ✨`, (_w, o) => `${o} ki roshni tez hai`],
    missTwice: [() => 'Sitara doob raha hai', () => 'Do baar? Sitara dhundhla'],
    miss: [() => 'Aaj ka Sitara thoda dhundhla', () => 'Sitare pe halka baadal ☁️'],
    hooked: [() => 'Hook ne Sitare ko bhi pakda 🪝', () => 'Sitara bhi hook se nahi bacha 🪝'],
    bigMake: [() => 'Sitara chamak raha hai ✨', () => 'Aaj inka hi din hai ✨'],
    soleMake: [() => 'Ek hi Sitara chamka ✨', () => 'Andhere mein ek Sitara'],
    nilMake: [() => 'Chupke se chamke ✨', () => 'Halki si chamak ✨'],
  },
  legend: {
    bigMake: [() => 'Legend ho toh aise 🏛️', () => 'Purane ustaad 🏛️'],
    soleMake: [() => 'Legend ne raah dikhayi 🏛️', () => 'Ek Legend, baaki sab dekh rahe'],
  },
};

const passed: Line[] = [
  () => 'Wazir ki nazar takht pe hai 👀',
  (w, o) => `${w} ne ${o} ko peeche chhoda`,
  () => 'Darbaar mein halchal 👀',
  (w) => `${w} upar chadh rahe hain`,
];

/** The pool for a line: the holder's mark's own, else the Badshah's set worded for that mark. */
export function poolFor(kind: BanterKind, mark: Mark): Line[] {
  if (kind === 'passed') return passed;
  if (mark === 'gold' || mark === 'silver' || mark === 'bronze') return gold[kind] ?? [];
  return others[mark]?.[kind] ?? [];
}

export const banter = {
  /** Screen readers hear the round's line once, as a status. */
  label: 'Table banter',
};
