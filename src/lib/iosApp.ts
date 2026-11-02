export interface ScreenFit {
  screenW: number;
  screenH: number;
  innerW: number;
  portrait: boolean;
}

/**
 * The page height for an iOS Home Screen app: the screen's, since the app covers all of it. The viewport iOS reports
 * can't be trusted there (it has come out a status bar short, and dvh a status bar long once the page grew). 0 when
 * the app has only part of the screen (iPad split view), where the usual viewport height stands.
 */
export function iosAppHeight({ screenW, screenH, innerW, portrait }: ScreenFit): number {
  // iOS never swaps screen.width and screen.height on rotation, so the sides are taken from the orientation.
  const long = Math.max(screenW, screenH),
    short = Math.min(screenW, screenH);
  const [w, h] = portrait ? [short, long] : [long, short];
  return Math.abs(innerW - w) <= 2 ? h : 0;
}

/**
 * In an iOS Home Screen app: marks the page (index.css moves top insets below the status bar's blur) and sizes it to
 * the screen. Runs before the first render so nothing moves once the app shows.
 */
export function fitIosApp() {
  if ((navigator as Navigator & { standalone?: boolean }).standalone !== true) return;
  const root = document.documentElement;
  root.setAttribute('data-ios-app', '');
  const portrait = matchMedia('(orientation: portrait)');
  const fit = () => {
    const h = iosAppHeight({
      screenW: screen.width,
      screenH: screen.height,
      innerW: window.innerWidth,
      portrait: portrait.matches,
    });
    if (h) root.style.setProperty('--app-h', `${h}px`);
    else root.style.removeProperty('--app-h');
  };
  fit();
  window.addEventListener('resize', fit);
}
