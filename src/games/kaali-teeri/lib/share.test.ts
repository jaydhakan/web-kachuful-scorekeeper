import { defaultRules, demoGame, type KtGame } from '@/games/kaali-teeri/domain';
import { finalStandings, shareCard, shareText } from './share';
import { example } from './rulesExample';

/** The demo's four scored hands, finished: Riya and Meera tie on 630. */
const finished = (): KtGame => {
  const g = demoGame();
  return { ...g, hands: g.hands.slice(0, 4), status: 'finished' };
};

describe('the share card and text', () => {
  it('ranks ties together and titles the card with the game', () => {
    const st = finalStandings(finished());
    expect(st.map((s) => [s.name, s.rank, s.total])).toEqual([
      ['Riya', 1, 630],
      ['Meera', 1, 630],
      ['Dev', 3, 540],
      ['Aarav', 4, 0],
      ['Kabir', 4, 0],
    ]);
    expect(shareCard(finished())).toMatchObject({
      title: 'Kaali Teeri',
      subtitle: '4 hands · final scores',
    });
  });

  it('writes a plain-text board, "so far" while the game is still on', () => {
    expect(shareText(finished()).split('\n').slice(0, 3)).toEqual([
      'Kaali Teeri · 4 hands · final scores',
      '1. 🐯 Riya  630',
      '1. 🐼 Meera  630',
    ]);
    expect(shareText(demoGame()).split('\n')[0]).toBe('Kaali Teeri · 4 hands · scores so far');
  });
});

describe('the rules page example', () => {
  it('is scored by the domain for one deck and two', () => {
    expect(example(defaultRules(5))).toEqual({
      bid: 180,
      total: 250,
      madeDef: 60,
      madeTeam: 190,
      made: 180,
      double: 360,
      missDef: 90,
      missed: 180,
    });
    expect(example(defaultRules(8))).toMatchObject({
      bid: 380,
      total: 500,
      double: 760,
      missed: 380,
    });
  });
});
