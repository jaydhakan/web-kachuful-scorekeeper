import { useEffect, useRef } from 'react';

/**
 * Keeps one browser history entry per open screen and sheet, so the system Back (Android, browser, swipe) closes
 * the top one instead of leaving the app. `depth` is how many are open; `onBack` closes the top one.
 */
export function useHistorySync(depth: number, onBack: () => void): void {
  const pushed = useRef(0);
  const skip = useRef(0);
  const back = useRef(onBack);
  back.current = onBack;

  useEffect(() => {
    const pop = () => {
      if (skip.current > 0) {
        skip.current--;
        return;
      }
      if (pushed.current === 0) return;
      pushed.current--;
      back.current();
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  useEffect(() => {
    if (depth > pushed.current) {
      for (let i = pushed.current; i < depth; i++) history.pushState({ kf: i + 1 }, '');
      pushed.current = depth;
    } else if (depth < pushed.current) {
      // Closed in the app: drop the entries it had, without treating that as another Back.
      skip.current++;
      history.go(depth - pushed.current);
      pushed.current = depth;
    }
  }, [depth]);
}
