export interface Viewport {
  screenW: number;
  screenH: number;
  innerW: number;
  innerH: number;
  /** env(safe-area-inset-top) in CSS pixels. */
  top: number;
}

/**
 * How far short of the screen the page is laid out: recent iOS sizes a Home Screen app's viewport without the status
 * bar yet still draws it from the top, which leaves a band the status bar's height empty at the bottom. Any other
 * difference is not that bug, so it gives 0 and leaves the layout alone.
 */
export function iosGap({ screenW, screenH, innerW, innerH, top }: Viewport): number {
  // iOS never swaps screen.width and screen.height on rotation, so the screen's height is taken from the orientation.
  const tall = innerH > innerW ? Math.max(screenW, screenH) : Math.min(screenW, screenH);
  const gap = tall - innerH;
  return top > 0 && Math.abs(gap - top) <= 2 ? gap : 0;
}

/**
 * In an iOS Home Screen app: marks the page (index.css moves top insets below the status bar's blur) and stretches it
 * over the empty band `iosGap` finds. Runs before the first render so nothing moves once the app shows.
 */
export function fitIosApp() {
  if ((navigator as Navigator & { standalone?: boolean }).standalone !== true) return;
  const root = document.documentElement;
  root.setAttribute('data-ios-app', '');
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const fit = () => {
    // The keyboard changes the measured heights without the screen changing; the last fit stands until it closes.
    const a = document.activeElement;
    if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement) return;
    const gap = iosGap({
      screenW: screen.width,
      screenH: screen.height,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      top: probe.offsetHeight,
    });
    if (gap) root.style.setProperty('--ios-gap', `${gap}px`);
    else root.style.removeProperty('--ios-gap');
  };
  fit();
  window.addEventListener('resize', fit);
}
