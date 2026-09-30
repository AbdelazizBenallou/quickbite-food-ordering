/**
 * External / non-Firebase API communication.
 *
 * Right now the app talks to exactly one non-Firebase backend: the static
 * menu file in assets/data/menu.json. New REST or GraphQL endpoints get their
 * own function here (see README: "Adding a new API").
 *
 * This file must never import the Firebase SDK.
 */
import { appConfig } from "../config/app.config.js";
import { MenuItem } from "../models/index.js";

/** GET a JSON document and return it parsed. */
export async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed with status ${response.status}`);
  }

  return response.json();
}

/** GET the menu catalogue → MenuItem[]. */
export async function getMenu() {
  const raw = await fetchJSON(appConfig.data.menu);
  return Array.isArray(raw) ? raw.map((item) => new MenuItem(item)) : [];
}
