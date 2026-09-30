/**
 * Menu business logic: where the menu comes from and how it is grouped.
 *
 * Source of truth is Firestore (`categories` + `items`) so the owner can add a
 * section or a product without any code change. When Firestore cannot be
 * reached — offline, blocked, database not created yet — the static
 * assets/data/menu.json is used instead, so the page always renders.
 */
import { getMenu } from "./apiService.js";
import { menuRepository } from "../repositories/index.js";
import { Category, MenuItem } from "../models/index.js";
import { appConfig } from "../config/app.config.js";

/** @type {Category[]} */
let categories = [];

/** @type {MenuItem[]} */
let catalogue = [];

/** "firestore" | "local" | "none" — reported by getMenuSource(). */
let source = "none";

/** Icon used when a category document has no `icon` field. */
const DEFAULT_ICON = "restaurant_menu";

/** Order used for a category that only exists implicitly (items without a doc). */
const IMPLICIT_ORDER = 999;

/**
 * Makes sure every item belongs to a section, so the view can simply group by
 * `categoryId`: if the owner adds an item but forgets its `categories` document,
 * it still shows up under a section instead of disappearing.
 */
function withImplicitCategories(items) {
  const known = new Set(categories.map((category) => category.id));
  const missing = [...new Set(items.map((item) => item.categoryId).filter((id) => id && !known.has(id)))];

  return categories.concat(
    missing.map((id) => new Category({ id, name: id, icon: DEFAULT_ICON, order: IMPLICIT_ORDER }))
  );
}

/** Loads the menu from Firestore, falling back to the local JSON file. */
export async function loadMenu() {
  try {
    const [remoteCategories, remoteItems] = await Promise.all([
      menuRepository.getCategories(),
      menuRepository.getItems(),
    ]);

    if (remoteItems.length) {
      categories = remoteCategories.length
        ? remoteCategories
        : appConfig.fallbackCategories.map((entry) => new Category(entry));
      catalogue = remoteItems;
      categories = withImplicitCategories(catalogue);
      source = "firestore";
      return catalogue;
    }

    console.warn("[menuService] Firestore returned no items (empty collection or offline) — using the local menu.");
  } catch (error) {
    console.warn("[menuService] Firestore unavailable, using the offline menu:", error?.message || error);
  }

  catalogue = await getMenu();
  categories = appConfig.fallbackCategories.map((entry) => new Category(entry));
  source = "local";
  return catalogue;
}

/** The full menu. */
export function getCatalogue() {
  return catalogue;
}

/** The sections, in display order. */
export function getCategories() {
  return categories;
}

/** One menu item, or null when the id is unknown. */
export function findMenuItem(id) {
  return catalogue.find((item) => item.id === id) || null;
}

/** True when the menu could not be loaded (e.g. the file is missing). */
export function isMenuEmpty() {
  return catalogue.length === 0;
}

/** "firestore" when the menu came from the database, "local" for the JSON file. */
export function getMenuSource() {
  return source;
}

/**
 * Items of one section, in `order`.
 * Sections with nothing available in them are dropped, so the page never shows
 * an empty heading.
 */
export function getItemsByCategory(categoryId) {
  return catalogue
    .filter((item) => item.categoryId === categoryId)
    .sort((a, b) => a.order - b.order);
}

/** [{ category, items }] for the whole menu, ready to render. */
export function getMenuSections() {
  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => ({ category, items: getItemsByCategory(category.id) }))
    .filter((section) => section.items.length > 0);
}
