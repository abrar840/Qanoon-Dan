import { useEffect, useState } from 'react';

/** React to a CSS media query, e.g. useMediaQuery('(min-width: 900px)'). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** The sidebar is a permanent column at this width and a drawer below it. */
export const DESKTOP_QUERY = '(min-width: 900px)';
