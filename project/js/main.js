/**
 * Application entry point.
 *
 * Boot order:
 *   1. connect Firebase   (js/firebase/firebase.js — local, no requests)
 *   2. load the menu      (menuService → Firestore `categories` + `items`,
 *                         falling back to assets/data/menu.json when offline)
 *   3. draw the menu      (components/menuView.js)
 *   4. seed the cart      (cartService → app.config)
 *   5. wire the UI        (controllers → services)
 *
 * Firebase is initialised in exactly one place: js/firebase/firebase.js.
 * No Firebase Auth is used: the menu is public and anyone may create an order.
 */
import { isFirebaseConnected, getProjectId } from "./firebase/firebase.js";
import { loadMenu, isMenuEmpty, getMenuSource, loadInitialCart } from "./services/index.js";
import { initControllers, renderMenuSections } from "./controllers/index.js";

function initFirebaseConnection() {
  if (isFirebaseConnected()) {
    console.log(`[main] Firebase connected → project "${getProjectId()}"`);
  } else {
    console.warn("[main] Firebase did not initialise with the expected project.");
  }
}

async function bootstrap() {
  initFirebaseConnection();

  try {
    await loadMenu();
    if (isMenuEmpty()) {
      console.warn("[main] No menu items — check the `items` collection or assets/data/menu.json");
    } else {
      renderMenuSections();
      console.log(`[main] Menu ready (source: ${getMenuSource()}).`);
    }
  } catch (error) {
    console.error("[main] Could not load the menu:", error);
  }

  loadInitialCart();
  initControllers();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
