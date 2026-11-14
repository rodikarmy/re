import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { faviconUrl } from "../../lib/validation";
import { spring, FAVICON_TIMEOUT_MS } from "../../lib/motion";

/**
 * FaviconBadge (`_Component3`) — реализация
 * из persona-form.pretty.js строки 2421-2485.
 *
 * Preload через Image с таймаутом 3000ms и referrerPolicy no-referrer;
 * при успехе — круг 24px с favicon в правом нижнем углу аватара.
 */
export interface FaviconBadgeProps {
  domain: string;
}

export function FaviconBadge({ domain }: FaviconBadgeProps) {
  const [loadedDomain, setLoadedDomain] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const src = faviconUrl(domain);
    const image = new Image();
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoadedDomain(null);
    }, FAVICON_TIMEOUT_MS);
    image.onload = () => {
      if (!cancelled) {
        window.clearTimeout(timeout);
        setLoadedDomain(domain);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        window.clearTimeout(timeout);
        setLoadedDomain(null);
      }
    };
    image.referrerPolicy = "no-referrer";
    image.src = src;
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [domain]);

  return (
    <AnimatePresence>
      {loadedDomain && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={spring}
          className="size-6 rounded-full bg-white border-2 border-white absolute -bottom-0.5 -right-0.5 overflow-clip shadow-subtle"
          key={loadedDomain}
        >
          <img
            src={faviconUrl(loadedDomain)}
            alt=""
            aria-hidden={true}
            referrerPolicy="no-referrer"
            onError={() =>
              setLoadedDomain((current) => (current === domain ? null : current))
            }
            className="size-full object-cover"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
