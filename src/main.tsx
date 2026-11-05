import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { fitIosApp } from './lib/iosApp';
import './styles/index.css';
import { shownTheme } from './theme/applyTheme';
import { loadThemeCss } from './theme/themeCss';
import { isThemeId } from './theme/themes';

fitIosApp();
// The build links the shown theme's stylesheet before the first paint (themeBoot); the dev server has no
// stylesheet to put it after, so it is linked here, after the CSS above.
const shown = shownTheme();
if (import.meta.env.DEV && isThemeId(shown)) void loadThemeCss(shown);
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
