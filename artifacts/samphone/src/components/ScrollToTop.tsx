import { useEffect } from "react";
import { useLocation } from "wouter";

/** Scroll the window to the top whenever the client route changes. */
export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location]);

  return null;
}
