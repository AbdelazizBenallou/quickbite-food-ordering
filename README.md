# كويك بايت — Food Delivery Order System

A restaurant food-ordering system: an Arabic (RTL) customer-facing menu plus an authenticated
admin dashboard, both talking to **Cloud Firestore**.

It is a **static site with no build step**. There is no bundler, no framework, no transpiler
and no server. You clone it, you serve the folder, it runs.

- **Storefront** — browse the menu, build a cart, check out. No account required.
- **Admin dashboard** — real Firebase Auth (email + password), gated on an `admin` custom claim.
  Today's orders, business statistics, order status management, store open/closed toggle.

> The database is the source of truth. Adding a category or a product in Firestore makes it
> appear on the site — **no code change, no redeploy**.

---

## Table of contents

1. [Quick start](#1-quick-start)
2. [How the system works](#2-how-the-system-works)
3. [Architecture](#3-architecture)
4. [Project structure](#4-project-structure)
5. [The data model](#5-the-data-model)
6. [The storefront, step by step](#6-the-storefront-step-by-step)
7. [The admin dashboard](#7-the-admin-dashboard)
8. [Configuration](#8-configuration)
9. [Security model](#9-security-model)
10. [Offline behaviour](#10-offline-behaviour)
11. [Theming](#11-theming)
12. [Deploying](#12-deploying)
13. [Known gaps](#13-known-gaps)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Quick start

### Prerequisites

| Requirement | Why | Check |
| --- | --- | --- |
| Node.js 18+ | runs the seeding scripts | `node -v` |
| Python 3 | dev web server (any static server works) | `python3 --version` |
| A Firebase project | holds the data | [console.firebase.google.com](https://console.firebase.google.com) |

> You do **not** need the Firebase CLI. The site never runs `firebase deploy` — hosting is
> plain static files.

### Step 1 — install dependencies

The site itself needs no packages. These are only needed for the seeding/admin scripts in
`tools/`, so install them if you plan to use those:

```bash
cd project
npm install
```

### Step 2 — create your Firebase config file

The real config is git-ignored, so supply it locally once:

```bash
cp project/js/config/firebase.config.example.js \
   project/js/config/firebase.config.js
```

Then open `project/js/config/firebase.config.js` and paste your values from
**Firebase console → ⚙ Project settings → General → Your apps → Web app →
"SDK setup and configuration" → Config**.

<details>
<summary>Creating a Firebase project from scratch</summary>

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. **Build → Firestore Database → Create database.**
   Choose *Start in production mode* — you will write the security rules in [§9](#9-security-model)
   before going live.
3. **Build → Authentication → Get started → Email/Password → Enable.**
   Required only for the admin dashboard.
4. **Project settings → General → Your apps → Web** (`</>`) → register an app, copy the config.

</details>

### Step 3 — create the Firestore database and seed the menu

```bash
# read-only: shows what is currently in the database
npm run seed:check

# write: creates / updates the 2 categories + 6 products
npm run seed
```

`tools/seed.js` deliberately uses the **public web config**, not the Admin SDK — so it goes
through the exact same security rules as the browser does. No service-account key is needed.

<details>
<summary>Seeding needs write access — the recommended way</summary>

The shipped rules only let anonymous visitors **create** orders, so the seed script is
rejected by default. The supported path is the Firebase Console, which bypasses rules:

**Firestore Database → Start data collection → `categories`**, add documents with the IDs
`food` and `drinks`; then a collection `items` with the six product IDs listed in
[§5](#5-the-data-model). Documents can be created by hand or imported from a JSON export.

The temporary open-rules route (only if you really want the script to write directly):
publish `allow read, write: if true;` in the Rules tab, run `npm run seed`, then immediately
republish the locked rules. Never leave open rules live — they would let anyone read every
customer's name, phone number and address.

</details>

### Step 4 — run it

```bash
npm start          # serves project/ on http://localhost:8080
```

- Storefront → <http://localhost:8080/>
- Admin login → <http://localhost:8080/admin/>

> **You must use a server, not `file://`.** The app is native ES modules, and browsers block
> module loading over `file://` because of CORS. Any static server is fine —
> `python3 -m http.server 8080`, `npx serve`, VS Code Live Server, etc.

### Step 5 — get into the admin dashboard

The storefront needs no login. The admin panel does, and it requires an account carrying the
`admin` custom claim:

1. **Authentication → Users → Add user** — create the account (email + password).
2. Download a service-account key: **Project settings → Service accounts → Generate new
   private key**. This downloads a JSON file that is **full admin access to your project**.
   Store it outside this repository.
3. Grant the claim, then delete the key file:

   ```bash
   node tools/grant-admin.mjs /secure/path/service-account.json owner@example.com
   ```

   The script prints the resulting `uid`, `email` and `customClaims`. It is a one-off tool —
   delete it once you have your admins, so nobody re-runs it.

> The custom claim lives in the ID token, so a newly granted claim is not visible until the
> token refreshes. `auth.js` forces a refresh (`getIdTokenResult(true)`) on every sign-in;
> if you were already signed in, sign out and back in.

---

## 2. How the system works

### The short version

The customer opens the page. The app asks Firestore for the menu, draws it, and watches a
live "is the store open" flag. The customer taps **+**, adjusts quantities, fills in name,
phone and address, and taps **تأكيد الطلب**. The app validates the form, builds an order
document, and writes it to `orders`. Within 30 seconds the admin dashboard picks it up, the
owner changes its status, and the customer never finds out.

### The four collections

| Collection | Shape | Purpose |
| --- | --- | --- |
| `categories/{id}` | one doc per section | menu headings — `food` → المأكولات, `drinks` → المشروبات |
| `items/{id}` | one doc per product | name, price, image, `categoryId`, `available`, `order` |
| `orders/{autoId}` | one doc per order | customer details, the item lines, the totals, the status |
| `settings/store` | a single doc | the open/closed flag |

### Two apps, one Firebase project

```
   CUSTOMER (no login)                 ADMIN (Firebase Auth + admin claim)
   ───────────────────                 ──────────────────────────────────
   index.html                          admin/index.html          (login)
     │                                 admin/pages/orders.html   (today's orders)
     │  reads categories, items         admin/pages/statistics.html
     │  reads settings/store            admin/pages/active-order-details.html
     │  writes orders                   admin/pages/menu-management.html  (stub)
     │                                 admin/pages/live-alerts.html       (stub)
     └──────────────┬────────────────────────┘
                    ▼
              Cloud Firestore
```

Both sides import the **same** `app` instance from `js/firebase/firebase.js`, so there is one
Firebase project, one Auth instance, one Firestore instance. The admin panel reuses the
storefront's CSS, fonts and Tailwind config through relative paths, so it cannot be deployed
separately from the customer site.

> **Consequence of sharing an origin:** an admin signed in on the admin panel is also a
> signed-in user on the customer site (same Auth persistence). That is harmless today, because
> the storefront never reads anything user-specific.

---

## 3. Architecture

The storefront uses a strict layered architecture. Two rules make it hold together:

> **Controllers never import the Firebase SDK. Repositories never touch the DOM.**

```
  ┌──────────────────────────────────────────────────────────────┐
  │  index.html          static markup, zero inline JS            │
  │  admin/pages/*.html  same, one <div id="admin-app"> mount    │
  └───────────────────────────┬──────────────────────────────────┘
                              │  data-add / data-qty / data-clear-cart
                              ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Components      js/components/     build DOM fragments       │
  │                  menuView.js        draw the menu             │
  │                  formView.js        field errors              │
  │                  confirmDialog.js   confirm sheet             │
  │                  themeToggle.js     toggle state              │
  └───────────────────────────┬──────────────────────────────────┘
                              │  function calls
                              ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Controllers    js/controllers/     DOM events, validation,  │
  │                                       loading + error states  │
  └───────────────────────────┬──────────────────────────────────┘
                              │  calls
                              ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Services       js/services/        business logic            │
  │                  menuService.js      menu source + grouping   │
  │                  cartService.js      cart state (in-memory)   │
  │                  orderService.js     build + persist an order │
  │                  apiService.js       non-Firebase HTTP        │
  │                  themeService.js     light/dark                │
  └───────────────────────────┬──────────────────────────────────┘
                              │  calls
                              ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Repositories   js/repositories/     the ONLY Firestore code │
  │                  index.js            returns Models          │
  └───────────────────────────┬──────────────────────────────────┘
                              │
                              ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Models         js/models/          Category, MenuItem,      │
  │                                       CartItem, Customer,     │
  │                                       Order                   │
  └──────────────────────────────────────────────────────────────┘
```

Two deliberate constraints keep the layers honest:

- **Models are plain data.** They never import Firebase. Repositories convert Firestore
  documents into models; services build them; controllers render them.
- **The cart is in memory only.** `cartService.js` holds a `CartItem[]` in a module variable.
  There is no `localStorage` persistence, so a refresh empties the cart. That is intentional:
  it keeps the state layer trivially testable and avoids stale-price bugs.

---

## 4. Project structure

```
project/
├── index.html                      # storefront — markup only, no inline <style>/<script>
├── package.json                    # scripts + deps (dev-only; the site has no build)
│
├── css/
│   ├── theme.css                   # light + dark colour tokens as CSS variables
│   ├── style.css                   # @font-face (5 Cairo subsets), Material Symbols, scrollbar
│   └── responsive.css              # @layer base rules, viewport height
│
├── admin/
│   ├── index.html                  # login page
│   ├── pages/                      # each page is a mount point + one module script
│   │   ├── orders.html             # today's orders dashboard
│   │   ├── statistics.html         # revenue, charts, top customers/meals
│   │   ├── active-order-details.html
│   │   ├── menu-management.html    # stub
│   │   └── live-alerts.html        # stub
│   └── js/
│       ├── auth.js                 # Firebase Auth + the `admin` claim check
│       ├── layout.js               # shared shell, drawer nav, route guard
│       ├── common.js               # shared helpers
│       ├── dashboard.js            # orders page            (645 lines — the big one)
│       ├── statistics.js           # statistics page
│       ├── active-order-details.js # active order page
│       ├── menu-management.js      # stub
│       ├── live-alerts.js          # stub
│       └── stub.js                 # the "coming soon" renderer
│
├── assets/
│   ├── data/menu.json              # the offline menu fallback
│   ├── fonts/                      # Cairo (3 subsets) + Material Symbols Outlined
│   ├── icons/favicon.svg
│   └── images/                     # logo + 6 product photos
│
├── js/
│   ├── main.js                     # storefront entry point
│   ├── theme.js                    # theme boot loader — runs before first paint
│   ├── tailwind.config.js          # sets the global `tailwind.config` object
│   ├── config/
│   │   ├── app.config.js           # all non-Firebase app config
│   │   ├── firebase.config.js      # YOUR Firebase config (git-ignored)
│   │   └── firebase.config.example.js  # ← the committed template
│   ├── firebase/
│   │   ├── firebase.js             # the ONLY initializeApp() call
│   │   └── firestore.js            # getFirestore(app)
│   ├── vendor/firebase/            # vendored ESM SDK builds (no CDN at runtime)
│   │   ├── firebase-app.js         #  105 KB
│   │   ├── firebase-auth.js        #  157 KB
│   │   └── firebase-firestore.js   #  685 KB
│   ├── models/index.js             # Category, MenuItem, CartItem, Customer, Order
│   ├── repositories/index.js       # the only Firestore calls in the app
│   ├── services/                   # menu, cart, order, api, theme
│   ├── controllers/index.js        # DOM wiring
│   ├── components/                 # menuView, formView, confirmDialog, themeToggle
│   └── utils/
│       ├── constants.js            # collection names, statuses, selectors
│       ├── helpers.js              # $, $$, formatNumber, copyText, escapeHtml, delegate
│       └── validators.js           # customer field rules
│
├── tools/
│   ├── seed.js                     # seed / inspect / clear the database
│   └── grant-admin.mjs             # one-off: set the `admin` custom claim
│
└── assets/…                        # (see above)
```

---

## 5. The data model

### `categories/{id}` — menu sections

```js
{
  name: "المأكولات",     // Arabic display name
  slug: "food",
  icon: "lunch_dining",  // Material Symbols name
  order: 1               // sort key, ascending
}
```

Seeded with `food` (order 1) and `drinks` (order 2).

### `items/{id}` — products

```js
{
  name: "بيتزا",
  price: 500,                          // د.ج
  image: "assets/images/pizza.jpg",    // a path on THIS site, not a Storage URL
  categoryId: "food",                  // must match a categories doc id
  available: true,                     // false → hidden from the menu
  order: 1                             // sort key within the category
}
```

Seeded with: `pizza` 500, `burger` 400, `sandwich` 300, `cola` 150, `pepsi` 150, `water` 50.

> If an item references a `categoryId` with no matching `categories` document, the app
> still shows it — `menuService.withImplicitCategories()` synthesises a section rather than
> letting the product vanish.

### `orders/{autoId}` — what a customer submits

```js
{
  userId: null,                 // reserved; the storefront has no auth
  items: [                     // a snapshot of the cart at checkout time
    { id: "pizza", name: "بيتزا", price: 500, qty: 2 }
  ],
  customer: {
    name: "محمد",
    phone: "0555123456",
    address: "شارع Kingston، مبنى 12"
  },
  itemCount: 2,                // total quantity, not number of lines
  subtotal: 1000,
  deliveryFee: 0,              // from appConfig.checkout.deliveryFee
  total: 1000,
  status: "pending",           // pending | confirmed | delivered | cancelled
  orderNumber: "",             // reserved for a human-readable sequence
  createdAt: <serverTimestamp>
}
```

`createdAt` uses `serverTimestamp()`, so the clock comes from Google, not the customer's
device. Both the dashboard and the statistics page sort and range-query on it.

### `settings/store` — the open/closed flag

```js
{ open: true }
```

A single document at the path `settings/store`. Read **live** via `onSnapshot` by the
storefront, written by the admin dashboard's toggle.

---

## 6. The storefront, step by step

### Boot sequence — `js/main.js`

1. **Connect Firebase** — `isFirebaseConnected()` checks the initialised app's `projectId`.
   This is a purely local check; it opens no socket.
2. **Load the menu** — `loadMenu()`.
3. **Draw the menu** — `renderMenuSections()`.
4. **Seed the cart** — `loadInitialCart()` (empty by default).
5. **Wire the UI** — `initControllers()`.

### Loading the menu — `menuService.loadMenu()`

```
Firestore  categories + items
    │
    ├── items found ──────────────► source = "firestore"   ✔
    │
    ├── empty collection ──┐
    │                      ├──► fetch assets/data/menu.json ──► source = "local"
    └── network error ─────┘
```

Both collections are read in parallel with `Promise.all`. Sorting happens in the repository
(`orderBy("order", "asc")`), so **no composite Firestore index is required** — a single-field
index is enough.

`getMenuSections()` then groups the catalogue by category, sorts sections by `order`, and
**drops empty sections** so the page never shows a heading with nothing under it.

### Cart — `cartService.js`

The cart is an array of `CartItem` models in a module variable. Notable behaviours:

- `addItem(id)` looks the item up in the catalogue — an unknown id is a no-op, so a stale
  button cannot inject an arbitrary product.
- `updateQty(index, delta)` **removes the line when the quantity hits 0**, matching the
  original design's stepper.
- Prices are copied from the catalogue into the cart at add-time, so the cart renders
  instantly and the customer sees a stable total.

### Checkout — `controllers/index.js`

Tapping **تأكيد الطلب**:

1. Bail out if the store is closed.
2. `readCustomerForm()` → a `Customer` model.
3. `validateCustomer()` — paints every invalid field red with an Arabic message and focuses
   the first bad one, so the customer never has to hunt for it.
4. `buildOrder(customer)` → an `Order` model (no I/O yet).
5. `persistOrder(order)` → writes to Firestore with a **10-second deadline**.
6. On success: show the order number (last 6 chars of the document id, uppercased) and scroll
   the success box into view. On failure: keep the cart and show a retry message — it never
   confirms an order that was not actually stored.

Validation is **live**: a field only re-validates while it is already red, so the form stays
quiet until the customer has actually tried to submit. The phone box strips non-digits as you
type and caps at 10. The accepted pattern (`/^0[567]\d{8}$/`) lives in `app.config.js` — change
the country there and nothing else needs editing.

### Store status — live

`storeRepository.onStatus()` subscribes to `settings/store` with `onSnapshot`. When the admin
closes the shop, every open customer tab updates **immediately**: the chip turns red, a notice
appears, and the confirm button freezes. If the read fails (rules, network), pages default to
*open* rather than locking out ordering.

---

## 7. The admin dashboard

### Authentication — a two-condition gate

`admin/js/auth.js` requires **both** a valid login **and** the `admin` custom claim:

```js
const credential = await signInWithEmailAndPassword(auth, email, password);
const token = await credential.user.getIdTokenResult(true);   // force refresh
if (token.claims.admin !== true) {
  await signOut(auth);                                        // signed out immediately
  throw new AdminAuthError("auth/not-admin", /* Arabic */);
}
```

Every failure mode is mapped to a specific Arabic message (`AUTH_ERROR_MESSAGES`): wrong
password, disabled account, rate limit, provider disabled, network failure, and — distinctly —
"this account is not an administrator". All 13 Firebase error codes are handled explicitly so
the user never sees a raw error string.

Each dashboard page mounts through `layout.js`, which calls `onAdminSession()` and does
`window.location.replace("../index.html")` when the session is absent or the claim is missing.

> **This is a UX guard, not the security boundary.** Anyone can bypass a client-side check by
> editing the JavaScript. The real enforcement is the Firestore rules — see
> [§9](#9-security-model).

### Pages

| Page | Reads | Writes | Notes |
| --- | --- | --- | --- |
| `admin/index.html` | — | — | Login. Redirects to `orders.html` on success. |
| `pages/orders.html` | `orders` (today), `settings/store` | `orders/{id}` status, `settings/store` | The main dashboard. Filters (new / finished / cancelled), stat tiles, per-order status buttons, copy-to-clipboard for id, phone and items, store toggle. |
| `pages/statistics.html` | `orders` (week ∪ month) | — | Revenue and order counts for day/week/month, a 7-day SVG donut, a bar chart, top 3 customers, top 5 meals, average basket, busiest weekday, cancellations, biggest invoice. |
| `pages/active-order-details.html` | `orders` (newest 100) | `orders/{id}` status | One order at a time: a 3-step journey stepper, `tel:` link, itemised bill, accept / finish / cancel. |
| `pages/menu-management.html` | — | — | **Stub** — "coming soon". |
| `pages/live-alerts.html` | — | — | **Stub** — "coming soon". |

### Refresh strategy — 30-second polling, not realtime

The dashboard pages call `setInterval(refresh, 30_000)` and re-run a `getDocs` query. They do
**not** use `onSnapshot`. So a new order can take up to 30 seconds to appear.

`storeRepository.onStatus()` (the `onSnapshot` version) already exists and works — the
storefront uses it. Switching the dashboard to it is a drop-in change and is the obvious next
step; see [§13](#13-known-gaps).

---

## 8. Configuration

### `js/config/app.config.js` — everything that is not Firebase

Pure data: no imports, no DOM access, no Firebase. This is the file to edit when adapting the
app to a different restaurant.

| Key | What it controls |
| --- | --- |
| `restaurant.name` / `.tagline` | brand strings in the header |
| `currency.code` / `.locale` | the `د.ج` suffix and the `1,200` grouping |
| `checkout.deliveryFee` | added to `subtotal` to produce `total` |
| `checkout.estimatedMinutes` | the delivery estimate shown after checkout |
| `checkout.fallbackOrderNumber` | displayed if an order could not be persisted |
| `validation.phonePatterns` | `/^0[567]\d{8}$/` — the accepted phone formats |
| `validation.phoneDigits` | the input cap, 10 |
| `data.menu` | path to the offline `menu.json` |
| `fallbackCategories` | the sections used when Firestore is unreachable |
| `initialCart` / `resetCart` | pre-fill the cart, e.g. `[{ id: "pizza", qty: 1 }]` |

### `js/config/firebase.config.js` — the Firebase Web App config

**Git-ignored.** The committed template is `firebase.config.example.js`; copy it locally and
fill in your values. See [§1, Step 2](#step-2--create-your-firebase-config-file).

---

## 9. Security model

### The trust boundary

```
   ANONYMOUS VISITOR                     FIREBASE
   ─────────────────                     ────────
   can read   categories, items           (public by design)
   can read   settings/store
   can create orders          ────────►   admin sign-in ──► `admin` claim
   can NOT    read orders                       │
   can NOT    write anything else               ▼
                                       read/write orders, settings/store
```

The storefront is fully public and unauthenticated. The admin dashboard requires
Firebase Auth plus the `admin` custom claim.

### What the client config is, and is not

The values in `firebase.config.js` are **public by design**. Firebase issues them to every
browser, and they grant no privileged access on their own — all access control lives in the
security rules. Rotating the API key does not close a hole.

They are git-ignored anyway, as defence in depth: a leaked key can be scraped and used to burn
your quota, and forks are forced to supply their own configuration instead of silently
writing to a database they do not own.

### Never commit

- **Service-account / private-key JSON.** Full admin access, bypassing every rule.
  `.gitignore` blocks `*service*account*.json`, `firebase-adminsdk-*.json`, `*.pem`, `*.key`,
  `*.p12`, and friends. If one is ever committed, **rotate it in the Firebase console
  immediately** — deleting the file from the history is not enough.
- The `firebase-admin` SDK in the front-end. It exists only in `tools/grant-admin.mjs`.

### Rules you should publish

> ⚠️ **The security rules are not in this repository.** They are configured in the Firebase
> console (Firestore Database → Rules) and are the single most important thing to get right
> before going live. Without them the database is either open to the world, or — as here —
> blocks the app.

A reasonable baseline:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Menu: public read, owner-only write
    match /categories/{id} { allow read: if true;  allow write: if false; }
    match /items/{id}      { allow read: if true;  allow write: if false; }

    // Store status: public read, admin write
    match /settings/store  { allow read: if true;  allow write: if isAdmin(); }

    // Orders: nobody reads anonymously; anyone may create a valid one; admin manages
    match /orders/{id} {
      allow read:   if isAdmin();
      allow create: if request.resource.data.keys().hasOnly([
                       'userId','items','customer','itemCount',
                       'subtotal','deliveryFee','total','status','orderNumber','createdAt'
                     )
                     && request.resource.data.customer.name is string
                     && request.resource.data.customer.name.size() > 0
                     && request.resource.data.customer.phone is string
                     && request.resource.data.customer.phone.size() > 0
                     && request.resource.data.customer.address is string
                     && request.resource.data.items is list
                     && request.resource.data.items.size() > 0
                     && request.resource.data.total == request.resource.data.subtotal
                                                  + request.resource.data.deliveryFee;
      allow update, delete: if isAdmin();
    }
  }

  function isAdmin() {
    return request.auth != null && request.auth.token.admin == true;
  }
}
```

The `create` rule matters most: it is the only thing standing between the public and a
form that writes arbitrary data. Validating `total == subtotal + deliveryFee` stops a tampered
client from submitting a doctored price.

Because anonymous visitors cannot read `orders`, the `tools/seed.js` flags in
[§1, Step 3](#step-3--create-the-firestore-database-and-seed-the-menu) (`--orders`,
`--clear-orders`) only work while the rules are open. Once locked, read orders from the
Firebase Console.

---

## 10. Offline behaviour

The app is designed to still render when Firestore is not available — new database, blocked
network, missing rules.

| Situation | What happens |
| --- | --- |
| Firestore reachable, items exist | Menu from Firestore. |
| Firestore returns zero items | Falls back to `assets/data/menu.json`. |
| Firestore throws (offline, denied) | Caught in `loadMenu()`; falls back to `menu.json`. |
| Store-status read fails | Defaults to **open** — the customer can still order. |
| Order write fails / times out | The cart is kept, an error is shown, no false confirmation. |

The active source is logged at boot: `[main] Menu ready (source: firestore|local)`.

To work fully offline, update `assets/data/menu.json` — it is the same shape as the `items`
collection.

---

## 11. Theming

Light and dark are driven by CSS custom properties in `css/theme.css`, mapped to Tailwind
colour utilities in `js/tailwind.config.js` (`surface`, `primary`, `error-container`, …).

**No flash of the wrong theme.** `js/theme.js` is a small classic script loaded
synchronously in `<head>`, before any CSS paint. It reads `localStorage["quickbite:theme"]`
and sets `data-theme` on `<html>` immediately. `themeService.js` reuses the same key and
attribute, so the boot loader and the toggle can never disagree.

Storage failures (private browsing, quota) are caught — the theme still applies for the
session, it just is not remembered.

**How Tailwind works here.** `js/vendor/tailwind.min.js` is the Tailwind **Play CDN** build.
There is no build step: the browser generates the CSS at runtime, and its `MutationObserver`
picks up elements added later by JavaScript (which is why classes like `bg-error-container`,
toggled in `controllers/index.js`, work). The trade-off is a ~410 KB download and a console
notice that Play CDN "should not be used in production". For a small restaurant site on a
static host that is a reasonable deal; if you outgrow it, run the Tailwind CLI as a build step
and serve a purged stylesheet.

---

## 12. Deploying

The site is pure static files. No build command, no output directory, no server runtime.

### Vercel

```bash
cd project
npx vercel deploy --prod
```

Or connect the repository in the dashboard and set:

| Setting | Value |
| --- | --- |
| Root directory | `project` |
| Build command | *(leave empty)* |
| Output directory | `.` |

`vercel.json` is intentionally absent — Vercel serves the static files as-is. Every asset
path in the HTML is relative, so the site works at any base path.

### Any other static host

Upload the **contents of `project/`** (not the parent folder) to Netlify, GitHub Pages,
Cloudflare Pages, Firebase Hosting, or any web server. Remember to exclude `node_modules/`.

### Before going live

- [ ] `project/js/config/firebase.config.js` holds **your** project's values.
- [ ] The Firestore security rules from [§9](#rules-you-should-publish) are published.
- [ ] Firestore is in **production mode**, not the free 30-day test mode.
- [ ] Email/Password auth is enabled, and only real staff accounts exist.
- [ ] Every non-admin user has been removed from Authentication → Users.
- [ ] Service-account key files are outside the repo, and the download has been deleted.
- [ ] `deliveryFee`, the phone pattern, and `restaurant.name` suit the real restaurant.
- [ ] Add the production domain to **Authentication → Settings → Authorised domains**.

---

## 13. Known gaps

Honest list of what is not finished.

1. **Security rules are not version-controlled.** They live only in the Firebase console
   ([§9](#9-security-model)). Put them in a `firestore.rules` file and deploy them with the
   Firebase CLI so they are reviewable and reproducible.
2. **Two admin pages are stubs.** `menu-management.html` and `live-alerts.html` render a
   "coming soon" card. Menu editing in particular is the obvious next feature — the reads
   (`menuRepository.getCategories/getItems`) and the rules hook already exist.
3. **The dashboard polls every 30 s.** A new order can take up to 30 s to appear.
   `storeRepository.onStatus()` already does the `onSnapshot` equivalent; reusing it in
   `dashboard.js` would make the dashboard realtime.
4. **`active-order-details.html` is not in the nav.** `layout.js` lists only four pages, so the
   page is reachable by URL or from `orders.html` but never shows as an active nav item.
5. **Tailwind Play CDN in production.** Works, but ships ~410 KB and logs a production
   warning. A CLI build step would fix both.
6. **The cart is not persisted** across reloads — intentional, but worth knowing.
7. **`orderNumber` is unused.** The UI derives a short number from the document id
   (`#A3F29C`). The field is reserved for a human-readable sequence.
8. **No tests, no linter, no CI.** There is no `lint` or `typecheck` script in `package.json`.

---

## 14. Troubleshooting

**Blank page, and the console says `Failed to resolve module specifier "…/firebase.config.js"`.**
You skipped [§1, Step 2](#step-2--create-your-firebase-config-file). The file is git-ignored,
so a fresh clone has only the `.example`. Copy it and fill in your values.

**`Uncaught TypeError` / nothing renders when opening `index.html` directly.**
You opened the file over `file://`. Native ES modules need a real server — run `npm start`.

**The menu says "جاري تحميل القائمة…" forever.**
Firestore is unreachable. Open the console and check the network tab. Common causes: the
database does not exist yet, or the rules do not allow public reads.

**`npm run seed` fails with `permission-denied`.**
Expected. The rules only allow anonymous visitors to *create* orders. See
[§1, Step 3](#step-3--create-the-firestore-database-and-seed-the-menu) — seed through the
console, or temporarily publish open rules and immediately restore them.

**Admin login says "بيانات الدخول غير صحيحة" but the password is right.**
Usually a missing `admin` custom claim, not bad credentials. Re-run
`node tools/grant-admin.mjs <key.json> <email>`, then **sign out and back in** so the refreshed
ID token is issued.

**A newly granted `admin` claim is ignored.**
The claim is embedded in the ID token, which is cached until it expires. `auth.js` forces a
refresh on sign-in, so a full sign-out/sign-in is the fix.

**The admin dashboard is empty but orders exist.**
Orders are not readable anonymously. Confirm you are signed in as an admin; otherwise read
them from the Firebase Console.

**Prices show as `500.00` instead of `500`.**
`appConfig.currency.locale` is `en-US` with fixed 2 decimals on `MenuItem.formattedPrice`.
Adjust the `toLocaleString` call in `js/models/index.js` to change the formatting.

**Tailwind classes have no effect.**
`js/vendor/tailwind.min.js` failed to load, or `js/tailwind.config.js` did not run before the
markup was scanned. Both are loaded from `index.html` — check their paths.

---

## License

Private project. All rights reserved.
