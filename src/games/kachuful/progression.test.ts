import { awardValue } from './progression';

const champ = { code: 'season_champion', playerId: 'a', value: 0.8125 };
const season = (value: number) => ({
  season: '2026-11',
  standings: [{ playerId: 'a', rank: 1, qualified: true, value, accuracy: 0.8125, games: 9 }],
  awards: [],
});

describe("Kachuful's award values", () => {
  it('reads a place as bid accuracy, or as points per round in a season closed on them', () => {
    expect(awardValue(champ, season(0.8125))).toBe('81%');
    expect(awardValue({ ...champ, value: 12.4 }, season(12.4))).toBe('12');
  });
});
