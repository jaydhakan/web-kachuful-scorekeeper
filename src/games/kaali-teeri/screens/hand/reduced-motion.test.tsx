import { render } from '@testing-library/react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { Outcome } from './Result';
import { TrumpCentre } from './Play';
import { TableMiddle } from './bidding/BidTable';

// The test setup prefers reduced motion: the verdict only fades, and a miss never tilts (A8's fallback).
const chip = () => [...document.querySelectorAll<HTMLElement>('[data-verdict-motion]')].at(-1)!;
const at = (made: boolean, over: number) => (
  <LazyMotion features={domAnimation} strict>
    <Outcome made={made} sweep="none" over={over} />
  </LazyMotion>
);

it('with reduced motion the verdict fades in place, made or missed', () => {
  const { rerender } = render(at(false, -10));
  rerender(at(true, 0));
  expect(chip().dataset.verdictMotion).toBe('fade');
  rerender(at(false, -5));
  expect(chip().dataset.verdictMotion).toBe('fade');
  expect(chip().style.transform).not.toMatch(/rotate/);
});

it('with reduced motion the trump and a won bid appear without scaling (A7)', () => {
  render(
    <LazyMotion features={domAnimation} strict>
      <TrumpCentre suit="spades" />
      <TableMiddle flat={false} won kicker="Bid won" amount={400} who="Meera" />
    </LazyMotion>,
  );
  for (const sel of ['[data-kt-bloom]', '[data-kt-land]'])
    expect(document.querySelector<HTMLElement>(sel)!.style.transform).not.toMatch(/scale/);
});
