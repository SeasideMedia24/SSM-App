'use client';

// Records the browser's IANA timezone in a cookie so server components (the
// dashboard calendar) can render Google times in the viewer's own zone. Renders
// nothing; runs once on mount and only writes when the value changed.

import { useEffect } from 'react';

export function TimezoneCookie() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && !document.cookie.split('; ').some((c) => c === `ssm_tz=${tz}`)) {
        // A year, root path, Lax — it's non-sensitive display info.
        document.cookie = `ssm_tz=${tz}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {
      /* Intl unavailable — server falls back to the studio's default zone */
    }
  }, []);
  return null;
}
