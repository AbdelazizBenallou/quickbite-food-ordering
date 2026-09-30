# Quick Bite — Food Delivery

Static restaurant ordering site with a Firebase admin dashboard. Arabic / RTL interface.
No build step, no framework — clone it, serve the folder, it runs.

---

## Requirements

- Node.js 18+ (only for the scripts in `tools/`)
- Python 3, or any static file server
- A Firebase project with Firestore enabled

---

## Setup

### 1. Install

```bash
cd project
npm install
```

### 2. Firebase config

The real config is git-ignored, so you must create it once:

```bash
cp project/js/config/firebase.config.example.js \
   project/js/config/firebase.config.js
```

Paste your values into it from **Firebase console → Project settings → General →
Your apps → Web app → SDK setup and configuration → Config**.

### 3. Seed the menu (optional)

```bash
npm run seed:check   # read-only: show what is in the database
npm run seed         # create 2 categories + 6 products
```

The seed script uses the public web config, not the Admin SDK, so it goes through
the same security rules as the browser. If it fails with `permission-denied`, add the
documents from the [Data model](#data-model) in the Firebase console instead.

### 4. Enable Email/Password auth (admin only)

**Authentication → Sign-in method → Email/Password → Enable.**

---

## Run

```bash
npm start     # serves on http://localhost:8080
```

| | |
|---|---|
| Storefront | <http://localhost:8080/> |
| Admin login | <http://localhost:8080/admin/> |

You must use a server, not `file://` — the app uses native ES modules, which browsers
block over `file://`.

---

## Admin access

The storefront needs no login. The admin dashboard requires a Firebase Auth account
that carries the `admin` custom claim.

1. **Authentication → Users → Add user** — create the account.
2. **Project settings → Service accounts → Generate new private key** — downloads a
   JSON file with full admin access to your project. Keep it outside this repository
   and delete it when you are done.
3. Grant the claim:

   ```bash
   node tools/grant-admin.mjs /secure/path/service-account.json owner@example.com
   ```

4. Sign in at `/admin/`, then delete the key file.

The claim lives in the ID token, so sign out and back in after granting it.

---

## Data model

Everything lives in Firestore. Add a category or product there and it appears on the
site — no code change, no redeploy.

| Collection | Fields | Purpose |
|---|---|---|
| `categories/{id}` | `name`, `icon`, `order` | menu sections — `food`, `drinks` |
| `items/{id}` | `name`, `price`, `image`, `categoryId`, `available`, `order` | products |
| `orders/{autoId}` | `items[]`, `customer{name,phone,address}`, `subtotal`, `deliveryFee`, `total`, `status`, `createdAt` | customer orders |
| `settings/store` | `open` | store open/closed flag |

`items.price` is an integer in the local currency. `items.image` is a path on this site,
not a URL. `status` is one of `pending`, `confirmed`, `delivered`, `cancelled`.

The storefront reads `settings/store` live, so closing the store in the admin panel
disables ordering on every open tab immediately.

---

## Configuration

Edit `js/config/app.config.js` for everything non-Firebase:

| Key | Controls |
|---|---|
| `restaurant.name` / `.tagline` | brand strings |
| `checkout.deliveryFee` | added to the subtotal |
| `validation.phonePatterns` | accepted phone formats (default: 10 digits starting 05/06/07) |
| `initialCart` / `resetCart` | pre-fill the cart |
| `fallbackCategories` | sections used when Firestore is unreachable |

---

## Security

- `js/config/firebase.config.js` is **git-ignored**. The Firebase Web App config is
  public by design, but keeping it out of the repo prevents key scraping and forces
  forks to supply their own. Copy from `.example`.
- **Never commit a service-account key.** It bypasses all Firestore security rules.
  `.gitignore` blocks the common filenames — if one is ever committed, rotate it in
  the Firebase console immediately.
- **Security rules are not in this repository.** They live in the Firebase console
  (Firestore Database → Rules) and must be set before going live: the storefront should
  be able to read `categories`, `items` and `settings/store`, and create `orders`, but
  never read `orders` back. The admin dashboard needs write access, gated on
  `request.auth.token.admin == true`.

---

## Deploying

Static files — no build command, no output directory.

```bash
cd project
npx vercel deploy --prod
```

Or set **Root Directory** = `project`, leave the build command empty. Any static host
works: upload the contents of `project/`.

Add your production domain to **Authentication → Settings → Authorised domains** so
admin login keeps working after deploy.

---

## Troubleshooting

**Blank page, console says it cannot resolve `firebase.config.js`.**
The file is git-ignored and missing. Do step 2 above.

**Nothing renders after opening `index.html` directly.**
You used `file://`. Run `npm start` instead.

**Menu stuck on "loading".**
Firestore is unreachable — usually the database does not exist yet, or the rules block
public reads. Check the browser console.

**`npm run seed` fails with `permission-denied`.**
Expected. The rules only allow creating orders. Seed from the console instead.

**Admin login rejects a correct password.**
Usually a missing `admin` claim, not bad credentials. Re-run `grant-admin.mjs`, then
sign out and back in.

**A newly granted claim is ignored.**
The claim is cached in the ID token until it expires. Sign out and back in.

---

## Not finished

- Two admin pages (`menu-management`, `live-alerts`) are stubs.
- The dashboard polls every 30s, so a new order can take up to 30s to appear.
- Security rules are not version-controlled — they live only in the Firebase console.
- No tests, linter, or CI.