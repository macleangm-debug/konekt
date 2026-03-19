/**
 * PWA Service Worker Registration
 * Call this in your main index.js or App.js
 */
export function registerPwaServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("PWA service worker registered:", registration.scope);
        })
        .catch((err) => {
          console.error("PWA service worker registration failed:", err);
        });
    });
  }
}

/**
 * Check if app is running as installed PWA
 */
export function isRunningAsPwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}
