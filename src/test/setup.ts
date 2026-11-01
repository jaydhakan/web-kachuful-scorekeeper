import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { motion } from 'framer-motion';
import { afterEach, beforeEach } from 'vitest';
import { storage } from '@/state/persistence';
import { resetArchive } from '@/state/archive';

class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.assign(globalThis, { ResizeObserver: Observer, IntersectionObserver: Observer });
// Components render `m` without App's LazyMotion here; creating one full motion component registers every feature.
void motion.div;

beforeEach(() => {
  window.matchMedia = (q: string) =>
    ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  localStorage.clear();
  storage.clearMemory();
  resetArchive();
});

afterEach(() => cleanup());
