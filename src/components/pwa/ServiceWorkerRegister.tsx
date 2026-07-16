"use client";

import { useEffect } from "react";
import { syncServiceWorkerRegistration } from "@/lib/pwa/register";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const run = () => {
      void syncServiceWorkerRegistration({
        hostname: window.location.hostname,
        serviceWorker: navigator.serviceWorker,
      }).catch(() => {
        // Offline support is best-effort; ignore registration failures.
      });
    };

    if (document.readyState === "complete") {
      run();
    } else {
      window.addEventListener("load", run, { once: true });
    }
  }, []);

  return null;
}
