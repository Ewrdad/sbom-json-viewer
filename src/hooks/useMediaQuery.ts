import { useState, useEffect } from "react";

/**
 * Custom hook to detect if a media query matches
 * @param {string} query The media query to match (e.g., '(max-width: 768px)')
 * @returns {boolean} Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

/**
 * Custom hook to detect if the current device is mobile
 * @returns {boolean} True if mobile viewport
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}
