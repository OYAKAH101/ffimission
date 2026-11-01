import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// A single-page app keeps the old scroll position when the route changes, so
// signing in could open the dashboard already scrolled down. Reset it instead.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
