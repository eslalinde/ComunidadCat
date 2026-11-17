"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development the SW's cache would serve stale JS/CSS over fresh builds.
    // Remove any worker left over from a previous session instead of registering.
    if (process.env.NODE_ENV === "development") {
      void unregisterDevServiceWorkers();
      return;
    }

    // Don't register SW in Electron
    if (!window.electronAPI) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "activated" &&
                  navigator.serviceWorker.controller
                ) {
                  // New version available - the user will get it on next navigation
                  console.log("New version of ComunidadCat available.");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("SW registration failed:", error);
        });
    }
  }, []);

  return null;
}

async function unregisterDevServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if (registrations.length > 0 && "caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best effort: a failure here only means stale assets may persist.
  }
}
