import { useEffect, useState } from 'react';

const QUERY = '(max-width: 760px), (pointer: coarse) and (max-width: 1024px)';

/** Phone/small-tablet layout: icon rails and drawers instead of the
 *  spread-out desktop panels. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (): void => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}
