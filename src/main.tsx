import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { fitIosApp } from './lib/iosApp';
import './styles/index.css';

fitIosApp();
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
