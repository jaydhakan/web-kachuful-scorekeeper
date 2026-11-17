import { domAnimation } from 'framer-motion';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { fitIosApp } from './lib/iosApp';
import { gameById } from './platform/catalog';
import { preparePage } from './platform/prepare';
import { currentGame, startRoute } from './platform/route';
import './styles/index.css';
import { shownTheme } from './theme/applyTheme';
import { loadThemeCss } from './theme/themeCss';
import { isThemeId } from './theme/themes';

fitIosApp();
startRoute();
// The build links the shown theme's stylesheet before the first paint (themeBoot); the dev server has no
// stylesheet to put it after, so it is linked here, after the CSS above.
const shown = shownTheme();
if (import.meta.env.DEV && isThemeId(shown)) void loadThemeCss(shown);

// The first page's chunks and the motion features (index.html has already started both) arrive before the first
// render, so React paints the page itself over the HTML's skeleton, never an empty loading screen in between. The
// page's wait is capped (a slow or failed fetch renders anyway, with the loader or Retry); the features' is not, as
// swapping them later breaks animations in flight (App). Unreachable, the app runs on the basic set.
const FIRST_RENDER_WAIT_MS = 3000;
const id = currentGame();
const features = import('./components/ui/motionMax').then(
  (m) => m.default,
  () => domAnimation,
);
void Promise.all([
  features,
  Promise.race([
    preparePage(id && gameById(id).status === 'live' ? id : null, location.search),
    new Promise((ok) => setTimeout(ok, FIRST_RENDER_WAIT_MS)),
  ]),
]).then(([f]) =>
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App features={f} />
    </StrictMode>,
  ),
);
