import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";

const recoverFromStaleBuild = (event) => {
  event?.preventDefault?.();
  const key = "recetitas_build_recovery";
  let lastRecovery = 0;
  try {
    lastRecovery = Number(sessionStorage.getItem(key) || 0);
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Reload recovery still works when session storage is unavailable.
  }
  if (Date.now() - lastRecovery < 30_000) return;
  const url = new URL(window.location.href);
  url.searchParams.set("appv", String(Date.now()));
  window.location.replace(url);
};

window.addEventListener("vite:preloadError", recoverFromStaleBuild);
window.addEventListener("unhandledrejection", (event) => {
  if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(String(event.reason?.message || event.reason || ""))) {
    recoverFromStaleBuild(event);
  }
});

createApp(App).mount("#app");
