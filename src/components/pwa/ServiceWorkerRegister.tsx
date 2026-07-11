"use client";

import { useEffect } from "react";

const PRODUCTION_HOSTS = new Set(["unionops.org", "www.unionops.org"]);

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Never register on localhost/CI — SW fetch interception can hang Playwright navigations.
    if (!PRODUCTION_HOSTS.has(window.location.hostname)) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          void reg.unregister();
        }
      });
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is best-effort; ignore registration failures.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
