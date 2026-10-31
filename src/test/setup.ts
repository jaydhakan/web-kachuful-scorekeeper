import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
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
