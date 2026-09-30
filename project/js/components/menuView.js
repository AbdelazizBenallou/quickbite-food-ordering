/**
 * The menu view — turns categories + items into the page markup.
 *
 * Pure DOM: it receives data and draws it. It never reads Firestore and never
 * decides anything about the cart. The classes are copied verbatim from the
 * original design so a data-driven menu looks exactly like the static one.
 */
import { ACTIONS } from "../utils/constants.js";
import { escapeHtml, toArabicDigits } from "../utils/helpers.js";

/** "3 items" in Arabic-Indic digits, like the design. */
const ITEMS_LABEL = "أصناف";

/** Classes of the "+ إضافة" pill (and its greyed-out variant). */
const BUTTON_CLASSES =
  "h-10 px-4 rounded-full bg-surface-container-low text-primary hover:bg-primary hover:text-on-primary " +
  "font-label-md text-label-md active:scale-95 transition-all flex items-center gap-1 shadow-sm " +
  "shrink-0 border border-outline-variant/30";

/** Classes of the 64×64 product image, and of the placeholder that replaces it. */
const IMAGE_CLASSES = "w-16 h-16 rounded-lg object-cover shrink-0";
const PLACEHOLDER_CLASSES =
  "w-16 h-16 rounded-lg shrink-0 bg-surface-container-low text-on-surface-variant " +
  "font-headline-sm text-headline-sm flex items-center justify-center";

/** First character of the name, used when a product has no image. */
function firstLetter(name) {
  return [...String(name || "").trim()][0] || "•";
}

/** A neutral 64×64 tile shown when there is no image, or the file fails to load. */
function createPlaceholder(name) {
  const tile = document.createElement("div");
  tile.className = PLACEHOLDER_CLASSES;
  tile.setAttribute("role", "img");
  tile.setAttribute("aria-label", name || "صورة غير متوفرة");
  tile.textContent = firstLetter(name);
  return tile;
}

/** The product image, or a placeholder when `image` is empty. */
function createImage(item) {
  if (!item.image) return createPlaceholder(item.name);

  const img = document.createElement("img");
  img.className = IMAGE_CLASSES;
  img.src = item.image;
  img.alt = item.name;
  img.loading = "lazy";
  // A wrong path must not leave a broken image icon in the card.
  img.addEventListener("error", () => img.replaceWith(createPlaceholder(item.name)), { once: true });
  return img;
}

/** The "+ إضافة" button, or a greyed "غير متوفر" button when sold out. */
function createAddButton(item) {
  const button = document.createElement("button");
  button.type = "button";

  if (!item.available) {
    button.className = `${BUTTON_CLASSES} opacity-50 cursor-not-allowed`;
    button.disabled = true;
    button.innerHTML = '<span class="font-label-md text-label-md">غير متوفر</span>';
    return button;
  }

  button.className = BUTTON_CLASSES;
  button.setAttribute(ACTIONS.ADD_TO_CART, item.id);
  button.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">add</span>' +
    '<span class="">إضافة</span>';
  return button;
}

/** One product card: image + name + price + add button. */
export function createMenuItemCard(item) {
  const card = document.createElement("div");
  card.className =
    "bg-surface-container-lowest rounded-xl p-space-sm flex items-center justify-between shadow-sm";

  const identity = document.createElement("div");
  identity.className = "flex items-center gap-space-md min-w-0";

  const text = document.createElement("div");
  text.className = "min-w-0";
  text.innerHTML =
    `<h4 class="font-label-lg text-label-lg text-on-surface">${escapeHtml(item.name)}</h4>` +
    `<p class="font-price-display text-price-display text-primary mt-0.5">${item.formattedPrice} د.ج</p>`;

  identity.append(createImage(item), text);
  card.append(identity, createAddButton(item));
  return card;
}

/** One section: icon + title + item count + the cards. */
export function createMenuSection(section) {
  const { category, items } = section;

  const element = document.createElement("section");
  element.className = "space-y-space-sm";
  element.dataset.category = category.id;

  const header = document.createElement("div");
  header.className = "flex items-center justify-between";
  header.innerHTML =
    '<div class="flex items-center gap-space-xs">' +
    `<span class="material-symbols-outlined text-primary text-[20px]">${escapeHtml(category.icon)}</span>` +
    `<h3 class="font-headline-sm text-headline-sm text-on-surface">${escapeHtml(category.name)}</h3>` +
    "</div>" +
    `<span class="font-label-sm text-label-sm text-on-surface-variant">${toArabicDigits(items.length)} ${ITEMS_LABEL}</span>`;

  const list = document.createElement("div");
  list.className = "grid grid-cols-1 gap-space-sm";
  items.forEach((item) => list.appendChild(createMenuItemCard(item)));

  element.append(header, list);
  return element;
}

/**
 * Draws the whole menu into the container. Called once the menu is loaded, and
 * again whenever it is reloaded.
 *
 * @param {Element} root      the container (#menu-root)
 * @param {Array<{category: object, items: object[]}>} sections
 * @returns {number} how many sections were drawn
 */
export function renderMenu(root, sections) {
  if (!root) return 0;

  root.replaceChildren(...sections.map((section) => createMenuSection(section)));
  return sections.length;
}
