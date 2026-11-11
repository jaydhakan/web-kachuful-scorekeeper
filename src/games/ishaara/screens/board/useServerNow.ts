import { useEffect, useState } from 'react';

/** The server's clock (device clock + offset), ticking every `ms` while `active`; still otherwise. */
export function useServerNow(clockOffset: number, active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now + clockOffset;
}
