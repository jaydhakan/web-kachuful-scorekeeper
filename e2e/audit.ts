import type { Locator, Page } from '@playwright/test';

export interface ScreenReport {
  screen: string;
  /** The primary action is missing, outside the viewport, or covered at its centre. */
  primary: string | null;
  /** Controls that must be on screen (bid pills) but are not. */
  offscreenControls: string[];
  /** Visible elements reaching past the left or right edge of the viewport. */
  offscreen: string[];
  /** Text cut by its own box or by an ancestor that hides overflow. */
  clipped: string[];
  /** Text shortened with an ellipsis ("Bartholo…"). Allowed only on seat labels, board headers and the podium. */
  shortened: string[];
  /** Scroll regions whose content is taller than the region. */
  scrolls: string[];
  /** Seat labels overlapping each other or a chip on the same table. */
  overlaps: string[];
  /** Interactive elements smaller than 44×44. */
  smallTargets: string[];
  /** Controls and table seats on screen whose centre is covered by something else (the bar, another panel). */
  covered: string[];
}

/** Measures one settled screen. It never fails a test by itself; the caller decides what is a violation. */
export async function auditScreen(
  page: Page,
  screen: string,
  opts: { primary?: Locator | null; controls?: Locator } = {},
): Promise<ScreenReport> {
  const vp = page.viewportSize()!;
  let primary: string | null = null;
  if (opts.primary) {
    const box = await opts.primary.boundingBox();
    if (!box) primary = 'missing';
    else if (
      box.x < 0 ||
      box.y < 0 ||
      box.x + box.width > vp.width + 1 ||
      box.y + box.height > vp.height + 1
    )
      primary = `outside viewport (${Math.round(box.y + box.height)} > ${vp.height})`;
    else {
      const hit = await opts.primary.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!top && (el === top || el.contains(top));
      });
      if (!hit) primary = 'covered';
    }
  }
  const offscreenControls: string[] = [];
  if (opts.controls) {
    for (const c of await opts.controls.all()) {
      const b = await c.boundingBox();
      if (
        !b ||
        b.y < 0 ||
        b.y + b.height > vp.height + 1 ||
        b.x < 0 ||
        b.x + b.width > vp.width + 1
      )
        offscreenControls.push((await c.getAttribute('aria-label')) ?? '?');
    }
  }
  const rest = await page.evaluate(() => {
    const label = (el: Element) =>
      el.getAttribute('aria-label') ||
      (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) ||
      el.tagName.toLowerCase();
    const W = innerWidth;
    const visible = (el: Element) =>
      !el.closest('[aria-hidden="true"],[inert]') &&
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const all = [...document.body.querySelectorAll('*')].filter(visible);
    const ownText = (el: Element) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent || '').trim());
    const offscreen: string[] = [],
      clipped: string[] = [],
      shortened: string[] = [],
      scrolls: string[] = [],
      smallTargets: string[] = [];
    for (const el of all) {
      const cs = getComputedStyle(el),
        r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if ((r.right > W + 1 || r.left < -1) && !hasSideScroll(el)) offscreen.push(label(el));
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1)
        scrolls.push(
          el.getAttribute('aria-label') ||
            document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent ||
            label(el),
        );
      if (
        el.matches('button,[role="button"],[role="switch"],a[href],input,[role="tab"]') &&
        (r.width < 43.5 || r.height < 43.5)
      )
        smallTargets.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      if (!ownText(el)) continue;
      const txt = (el.textContent || '').trim();
      if (/…/.test(txt)) shortened.push(txt);
      if (
        (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible') ||
        (el.scrollHeight > el.clientHeight + 1 && /(hidden|clip)/.test(cs.overflowY)) ||
        (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth)
      ) {
        clipped.push(txt.slice(0, 40));
        continue;
      }
      // An ancestor that hides overflow can cut text the element itself lets spill; a side scroller reveals it.
      if (hasSideScroll(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tr = range.getBoundingClientRect();
      for (let a = el.parentElement; a; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (!/(hidden|clip)/.test(acs.overflowX) || /(auto|scroll)/.test(acs.overflowY)) continue;
        const ar = a.getBoundingClientRect();
        if (tr.left < ar.left - 1 || tr.right > ar.right + 1) {
          clipped.push(txt.slice(0, 40) + ' (by ancestor)');
          break;
        }
      }
    }
    function hasSideScroll(el: Element) {
      for (let a = el.parentElement; a; a = a.parentElement)
        if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) return true;
      return false;
    }
    const covered: string[] = [];
    for (const el of all) {
      if (!el.matches('button,[role="button"],[role="switch"],input,[data-seat] > div')) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2,
        y = r.top + r.height / 2;
      if (r.width === 0 || x < 0 || x > W || y < 0 || y > innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (top && !el.contains(top) && !top.contains(el)) covered.push(label(el));
    }
    const overlaps: string[] = [];
    for (const t of document.querySelectorAll('[data-table]')) {
      if (!visible(t)) continue;
      const names = [...t.querySelectorAll('[data-seat-name]')].map((el) => {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        return { txt: (el.textContent || '').trim(), r: rg.getBoundingClientRect() };
      });
      const chips = [...t.querySelectorAll('[data-seat-bid],[data-seat-chip]')].map((el) => ({
        txt: 'chip ' + (el.textContent || '').trim(),
        r: el.getBoundingClientRect(),
      }));
      const hit = (a: DOMRect, b: DOMRect) =>
        a.left < b.right - 0.5 &&
        b.left < a.right - 0.5 &&
        a.top < b.bottom - 0.5 &&
        b.top < a.bottom - 0.5;
      names.forEach((a, i) => {
        names.slice(i + 1).forEach((b) => hit(a.r, b.r) && overlaps.push(`${a.txt} × ${b.txt}`));
        chips.forEach((c) => hit(a.r, c.r) && overlaps.push(`${a.txt} × ${c.txt}`));
      });
    }
    return { offscreen, clipped, shortened, scrolls, overlaps, smallTargets, covered };
  });
  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    screen,
    primary,
    offscreenControls,
    offscreen: uniq(rest.offscreen),
    clipped: uniq(rest.clipped),
    shortened: uniq(rest.shortened),
    scrolls: uniq(rest.scrolls),
    overlaps: uniq(rest.overlaps),
    smallTargets: uniq(rest.smallTargets),
    covered: uniq(rest.covered),
  };
}
