import { ACHIEVEMENTS } from '@/domain';
import { achievements } from './achievements';

it('every achievement in the catalogue has a name and a description, and nothing extra', () => {
  expect(Object.keys(achievements).sort()).toEqual(ACHIEVEMENTS.map((a) => a.code).sort());
  for (const e of Object.values(achievements)) expect(e.name && e.how).toBeTruthy();
});
