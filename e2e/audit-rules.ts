import type { ScreenReport } from './audit';

/** Screens that must fit without scrolling on a portrait phone (docs/RESPONSIVE-PLAN.md section 3, rule 1). */
const ONE_SCREEN = ['01-home', '02-setup1', '03-setup2', '07-setup3', '09-bidding', '15-play'];
/** Results and Summary fit up to five players; six or more may scroll their list. */
const ONE_SCREEN_UP_TO_FIVE = ['16-results', '17-summary'];

/**
 * What counts as a violation, as one line each. Seat labels, the podium and the Scoreboard headers may be
 * shortened and `covered` is a list of candidates to look at, so neither is a violation here.
 */
export function violations(
  r: ScreenReport,
  where: { width: number; height: number; players: number },
): string[] {
  const out: string[] = [];
  const add = (kind: string, items: string[]) =>
    items.forEach((i) => out.push(`${r.screen} ${kind}: ${i}`));
  if (r.primary) out.push(`${r.screen} primary action: ${r.primary}`);
  add('control off screen', r.offscreenControls);
  add('reaches past the screen edge', r.offscreen);
  add('clipped text', r.clipped);
  add('overlap', r.overlaps);
  add('target under 44px', r.smallTargets);
  add('page scrolls sideways', r.pageOverflow);
  // At 360x640 and up in portrait the content and its action fit; a smaller phone may scroll.
  const portraitFits = where.width < where.height && where.width >= 360 && where.height >= 640;
  const mustFit =
    ONE_SCREEN.includes(r.screen) ||
    (ONE_SCREEN_UP_TO_FIVE.includes(r.screen) && where.players <= 5);
  if (portraitFits && mustFit) add('scrolls although it should fit', r.scrolls);
  return out;
}
