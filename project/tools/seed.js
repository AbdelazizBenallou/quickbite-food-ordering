/**
 * Seeds Firestore with the restaurant catalogue: `categories` + `items`.
 *
 *   node tools/seed.js --check    read-only: shows the categories and items
 *   node tools/seed.js --orders   read-only: shows the stored orders
 *   node tools/seed.js            write: creates / updates the 8 documents
 *
 * Uses the same web config as the site (js/config/firebase.config.js), so it goes
 * through the security rules exactly like the browser does. No service-account
 * key, no Admin SDK, nothing secret on disk.
 *
 * Note: --orders only works while the rules are open. Once the locked rules are
 * published, orders are readable in the Firebase Console instead.
 */
import { createRequire } from "node:module";
import { firebaseConfig } from "../js/config/firebase.config.js";

// The installed SDK ships a CJS build for Node (its Node ESM entry is absent), so
// load it through require() instead of a static import.
const require = createRequire(import.meta.url);
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, getDoc, setDoc, query, orderBy, writeBatch } = require("firebase/firestore");

const CHECK_ONLY = process.argv.includes("--check");
const SHOW_ORDERS = process.argv.includes("--orders");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/** The two sections of the menu. Names match the design ("المأكولات"). */
const categories = [
  { id: "food", name: "المأكولات", slug: "food", icon: "lunch_dining", order: 1 },
  { id: "drinks", name: "المشروبات", slug: "drinks", icon: "local_cafe", order: 2 },
];

/** The products. `image` is a path on this site, not a Firebase Storage URL. */
const items = [
  { id: "pizza", name: "بيتزا", price: 500, categoryId: "food", image: "assets/images/pizza.jpg", available: true, order: 1 },
  { id: "burger", name: "برغر", price: 400, categoryId: "food", image: "assets/images/burger.jpg", available: true, order: 2 },
  { id: "sandwich", name: "ساندويتش", price: 300, categoryId: "food", image: "assets/images/sandwich.jpg", available: true, order: 3 },
  { id: "cola", name: "كوكاكولا", price: 150, categoryId: "drinks", image: "assets/images/cola.jpg", available: true, order: 1 },
  { id: "pepsi", name: "بيبسي", price: 150, categoryId: "drinks", image: "assets/images/pepsi.jpg", available: true, order: 2 },
  { id: "water", name: "ماء معدني", price: 50, categoryId: "drinks", image: "assets/images/water.jpg", available: true, order: 3 },
];

const line = (n = 64) => "─".repeat(n);

async function readAll(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Prints the stored orders, newest first. */
async function showOrders() {
  console.log(`\nProject: ${firebaseConfig.projectId}\n${line()}\n`);

  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  const orders = snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));

  if (!orders.length) {
    console.log("No orders yet.\n");
    return true;
  }

  console.log(`ORDERS  ${orders.length}\n`);
  for (const order of orders) {
    const when = order.createdAt?.toDate?.() || null;
    console.log(`${line()}`);
    console.log(`  id          ${order.id}`);
    console.log(`  createdAt   ${when ? when.toISOString() : "—"}`);
    console.log(`  name        ${order.customer?.name ?? "—"}`);
    console.log(`  phone       ${order.customer?.phone ?? "—"}`);
    console.log(`  address     ${order.customer?.address ?? "—"}`);
    console.log(`  status      ${order.status ?? "—"}`);
    console.log(`  items       ${order.itemCount} (${order.subtotal} د.ج)`);
    (order.items || []).forEach((item) =>
      console.log(`      - ${item.name} x${item.qty} = ${item.subtotal ?? item.price * item.qty} د.ج`)
    );
    console.log(`  total       ${order.total} د.ج`);
  }
  console.log(`\n${line()}\n`);
  return true;
}

async function check() {
  console.log(`\nProject  : ${firebaseConfig.projectId}`);
  console.log(`Database : (default) ${app.options.projectId}\n${line()}`);

  let ok = true;

  for (const name of ["categories", "items"]) {
    try {
      const rows = await readAll(name);
      console.log(`\nREAD  ${name}  → ${rows.length} document(s)`);
      if (rows.length) {
        for (const r of rows.sort((a, b) => (a.order || 0) - (b.order || 0))) {
          const extra = r.price !== undefined
            ? `${r.price} د.ج · ${r.categoryId} · ${r.available === false ? "غير متوفر" : "متوفر"}`
            : r.slug;
          console.log(`      ${r.id.padEnd(10)} ${String(r.name).padEnd(12)} ${extra}`);
        }
      }
    } catch (err) {
      ok = false;
      console.log(`\nREAD  ${name}  → FAILED`);
      console.log(`      ${err.code || "Error"}: ${err.message}`);
    }
  }

  console.log(`\n${line()}`);
  if (!ok) {
    console.log(
      "Something is blocking access. Most likely one of:\n" +
        "  1. Firestore Database was not created yet\n" +
        "     console → Build → Firestore Database → Create database\n" +
        "  2. The rules do not allow public reads\n" +
        '     match /{collection}/{id} { allow read: if true; allow write: if false; }'
    );
  }
  return ok;
}

async function seed() {
  console.log(`\nProject: ${firebaseConfig.projectId}\n${line()}`);

  for (const category of categories) {
    const { id, ...data } = category;
    const ref = doc(db, "categories", id);
    const existing = await getDoc(ref);
    await setDoc(ref, data, { merge: true });
    console.log(`categories/${id.padEnd(8)} ${existing.exists() ? "updated" : "created"}  ${data.name}`);
  }

  for (const item of items) {
    const { id, ...data } = item;
    const ref = doc(db, "items", id);
    const existing = await getDoc(ref);
    await setDoc(ref, data, { merge: true });
    console.log(
      `items/${id.padEnd(13)} ${existing.exists() ? "updated" : "created"}  ` +
        `${data.name} · ${data.price} د.ج · ${data.categoryId}`
    );
  }

  console.log(`\n${line()}\nDone — ${categories.length} categories, ${items.length} items.\n`);
}

/**
 * Deletes every order. Needs `--yes` as well, so it can never run by accident.
 */
async function clearOrders() {
  if (!process.argv.includes("--yes")) {
    console.log("\nRefusing to delete: re-run with --clear-orders --yes\n");
    return false;
  }

  const snap = await getDocs(collection(db, "orders"));
  const batch = writeBatch(db);
  snap.docs.forEach((entry) => batch.delete(entry.ref));
  await batch.commit();

  console.log(`\nDeleted ${snap.size} order(s).\n`);
  return true;
}

try {
  if (SHOW_ORDERS) {
    await showOrders();
  } else if (process.argv.includes("--clear-orders")) {
    await clearOrders();
  } else if (CHECK_ONLY) {
    const ok = await check();
    process.exit(ok ? 0 : 1);
  } else {
    await seed();
  }
} catch (err) {
  console.error(`\nFAILED  ${err.code || "Error"}: ${err.message}\n`);
  if (err.code === "permission-denied") {
    console.error(
      "The security rules rejected the write.\n" +
        "Temporarily publish an open rule in the console (Rules tab):\n\n" +
        '  rules_version = \'2\';\n' +
        "  service cloud.firestore {\n" +
        "    match /databases/{database}/documents {\n" +
        "      match /{document=**} { allow read, write: if true; }\n" +
        "    }\n" +
        "  }\n\n" +
        "Re-run this script, then publish the locked rules again."
    );
  }
  if (err.code === "not-found" || err.code === 404 || err.code === "failed-precondition") {
    console.error("Create the database first: console → Build → Firestore Database → Create database.");
  }
  process.exit(1);
}
