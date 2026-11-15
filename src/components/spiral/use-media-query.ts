import { useEffect, useState } from "react";

/** Matches a media query, SSR-safe, reacting to changes. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined" && "matchMedia" in window) {
      try {
        return window.matchMedia(query).matches;
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    try {
      if (!("matchMedia" in window)) return;
      const queryList = window.matchMedia(query);
      setMatches(queryList.matches);
      const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
      queryList.addEventListener("change", onChange);
      return () => queryList.removeEventListener("change", onChange);
    } catch {
      return;
    }
  }, [query]);

  return matches || false;
}

/** True on coarse pointers (touch), where the label reads "Tap & hold". */
export function useIsTouchDevice(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
