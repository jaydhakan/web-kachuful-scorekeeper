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

// The first page's chunks (index.html has already started them) arrive before the first render, so React paints the
// page itself over the HTML's skeleton, never an empty loading screen in between. Capped: a slow or failed fetch
// renders anyway, with the loader or Retry.
const FIRST_RENDER_WAIT_MS = 3000;
const id = currentGame();
const render = () =>
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
void Promise.race([
  preparePage(id && gameById(id).status === 'live' ? id : null, location.search),
  new Promise((ok) => setTimeout(ok, FIRST_RENDER_WAIT_MS)),
]).then(render);
