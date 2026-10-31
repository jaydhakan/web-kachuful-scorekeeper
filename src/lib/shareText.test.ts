import { demoGame } from '@/domain';
import { shareText } from './shareText';

describe('shareText', () => {
  it('lists the standings with competition ranks', () => {
    expect(shareText(demoGame()).split('\n')).toEqual([
      'Kachuful · 6 rounds · final scores',
      '1. 🦊 Kabir  60',
      '2. 🐸 Dev  30',
      '3. 🦁 Aarav  10',
      '4. 🐯 Riya  −20',
      '5. 🐼 Meera  −30',
    ]);
  });
});
