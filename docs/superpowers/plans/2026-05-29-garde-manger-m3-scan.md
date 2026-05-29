# M3 — Scanning + Open Food Facts

**Milestone goal:** A member can scan a packaged product's barcode (or type it),
the app resolves its name/brand/image from Open Food Facts (server-side,
**cache-first**), and the member sets the **use-by date (DLC)**, quantity and
location to add it as a `kind=packaged` inventory item. Manual entry is always
available as a fallback. OFF is queried at most **once per genuine cache miss**.

**Branch:** `feat/garde-manger-m3-scan`
**Spec sources:** design §5 (`products` table), §6.1 (scan flow), §8 (islands), §9
(OFF integration), §11 (security). Reuse M2 authz pattern (`requireMembership`
against `activeHouseholdId`, never the raw cookie). `setStatus` is already
household-scoped, so packaged items inherit the IDOR fix.

---

## Guardrails (apply to every task)

- **Per-task verification gate:** `bun run lint` **AND** `bun run check` **AND**
  `bun test` must all pass before a task is considered done. (Lint regressions
  accumulated silently in M1 — run all three every task.)
- **CSRF stays ON.** Never add `csrf: { checkOrigin: false }`. Test form POSTs
  with `-H "origin: http://localhost:5173"`; the built server needs `ORIGIN` set.
- **`bun:sqlite` is synchronous** — no `await` on `.get()/.run()/.all()`.
- **No network in tests.** Nothing under `bun test` may hit OFF. The OFF client
  takes an injectable `fetchImpl`; tests pass a fake. CI/test must be hermetic.
- **Pure/testable seam.** `$lib/server/off.ts` must NOT import `$env`/`$app` so
  `bun test` can import it. Env + filesystem live in a thin server-only config
  module that the route glue calls; `off.ts` receives host/UA/image-store as args.
- **ODbL separation (non-negotiable):** OFF data lives ONLY in the `products`
  cache table and on the volume. It must NEVER be written into `foods`/
  `shelf_lives` (keeps the curated catalogue free of ODbL share-alike).
- **Rate-limit discipline:** OFF allows ~15 reads/min **per IP**, and our server
  is one IP for everyone. Cache-first is mandatory: **1 real scan ⇒ at most 1 OFF
  call.** A re-scan of the same barcode must hit cache, not OFF. Negative
  (`not_found`) results are cached with a TTL.
- **i18n parity:** every new user-facing string gets an `fr` + `en` key; the
  parity test must stay green. FR is the default/primary locale.

---

## Task 1 — `products` schema + migration `0003`

Add to `src/lib/server/db/schema.ts`:

```ts
export const products = sqliteTable('products', {
  barcode: text('barcode').primaryKey(),           // normalized EAN-13/EAN-8
  name: text('name'),                              // OFF product_name (nullable)
  brand: text('brand'),                            // OFF brands (nullable)
  imagePath: text('image_path'),                   // relative path on the volume, nullable
  quantity: text('quantity'),                      // OFF quantity string e.g. "500 g"
  categories: text('categories'),                  // OFF categories_tags joined, nullable
  status: text('status', { enum: ['found', 'not_found'] }).notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull()
});
```

- **Deliberate decision — no FK from `inventory_items.barcode` → `products`.**
  Keep the existing nullable `barcode` text column as-is. Rationale: (1) the OFF
  cache is prunable/refreshable independently and we must NOT cascade-delete
  inventory history when a cache row is evicted; (2) adding a constraint to the
  existing table forces a 12-step SQLite table rebuild around the stored
  generated `effective_date` column — fragile for no real gain. The relationship
  is logical, joined in app code. Document this in a code comment.
- Generate migration with `bun run db:generate` → review the emitted
  `0003_*.sql` (must be a plain `CREATE TABLE products`, no inventory rebuild).
- **Test** `src/lib/server/db/schema-products.test.ts` (createDb + mkdtemp,
  isolated): insert a `found` row + a `not_found` row, select back, assert
  `barcode` PK rejects a duplicate insert, timestamp round-trips.

---

## Task 2 — Shared barcode utility `$lib/barcode.ts` (pure)

Pure module usable from both the client island and server validation (no
`$app`/`$env`, no DOM):

- `normalizeBarcode(raw: string): string | null` — strip non-digits; UPC-A (12)
  → EAN-13 (prefix `0`); UPC-E (8) → expand to UPC-A → EAN-13; accept EAN-8 (8)
  and EAN-13 (13) as-is; return `null` if it can't be a valid GTIN length.
- `isValidBarcode(code: string): boolean` — digits-only and length ∈ {8,13}
  after normalization; verify the GTIN check digit.
- **Test** `src/lib/barcode.test.ts`: UPC-A→EAN-13, UPC-E expansion, EAN-8/13
  pass-through, check-digit accept/reject, garbage → null.

---

## Task 3 — OFF client `$lib/server/off.ts` (pure, cache-first, injectable)

The **only** module that calls Open Food Facts. No `$env`/`$app`/`fs` imports.

```ts
export interface OffConfig {
  host: string;           // 'https://world.openfoodfacts.org' (prod) | '.net' (dev/staging)
  userAgent: string;      // required by OFF
  notFoundTtlMs: number;  // re-attempt a not_found after this
  basicAuth?: string;     // 'off:off' for the .net staging host
  imageHostAllowlist: string[]; // only download images from these hosts (SSRF guard)
}
export interface ImageStore {                       // injected; default writes to disk
  save(barcode: string, bytes: Uint8Array, contentType: string): Promise<string>; // returns relative path
}
export type LookupDeps = {
  fetchImpl?: typeof fetch;  // default: global fetch
  now?: Date;                // default: new Date()
  imageStore?: ImageStore;   // default: provided by route glue
  timeoutMs?: number;        // short OFF timeout, default ~3500ms
};
export async function lookupProduct(
  db: DB, barcode: string, cfg: OffConfig, deps?: LookupDeps
): Promise<typeof products.$inferSelect>;
export function parseOffV2(json: unknown): { status: 'found' | 'not_found'; name?; brand?; quantity?; categories?; imageUrl? };
```

Behaviour:
1. **Cache-first.** `SELECT … FROM products WHERE barcode = ?`. If a `found` row
   exists → return it (never call OFF). If a `not_found` row exists and
   `now - fetchedAt < notFoundTtlMs` → return it (no OFF call). Otherwise miss.
2. On miss: `fetch(`${host}/api/v2/product/${barcode}.json?fields=product_name,brands,image_front_url,image_front_small_url,quantity,categories_tags`)`
   with `User-Agent` header (+ basic auth on staging), `AbortSignal.timeout(timeoutMs)`.
3. Parse v2: `status:1` → `found`; `status:0` → `not_found`.
4. On `found` with an image URL: **validate the URL host against
   `imageHostAllowlist`** (SSRF guard — never fetch an arbitrary host), download
   `image_front_small_url` (short timeout), and `imageStore.save(...)`. Image
   download failure is **non-fatal** — store the row without an image.
5. **Upsert** the `products` row (`onConflictDoUpdate` by barcode) with
   `fetchedAt = now`. Return it.
6. **OFF timeout / network error / non-2xx:** do NOT cache a transient failure
   as `not_found` (that would poison the cache). Throw a typed `OffUnavailable`
   error; the route catches it and renders the manual-entry fallback.
- **Test** `src/lib/server/off.test.ts` (createDb + mkdtemp, fake `fetchImpl`,
  in-memory `imageStore`, fixed `now`):
  - cache hit (found) returns WITHOUT calling fetch (assert fetch call count 0);
  - miss calls fetch exactly once, caches `found`, second call → 0 fetches
    (proves "1 scan ≤ 1 OFF call");
  - `not_found` cached; within TTL → 0 fetches; after TTL → re-fetches;
  - OFF timeout/error → throws `OffUnavailable`, nothing cached as not_found;
  - image download failure → row stored, `imagePath` null;
  - SSRF: image URL on a non-allowlisted host → not downloaded, `imagePath` null;
  - `parseOffV2` shape mapping (status 0/1, missing fields).

---

## Task 4 — Server config glue `$lib/server/productConfig.ts` (env + fs)

Thin server-only module — the single place that reads env and touches the disk
for products. Keeps `off.ts` pure.

- `getOffConfig(): OffConfig` — host = `OFF_HOST` or, when `NODE_ENV !==
  'production'`, default to the `.net` staging host with `off:off` basic auth;
  prod default `https://world.openfoodfacts.org`. `userAgent = OFF_USER_AGENT`
  (assert present in production — mirror the M1 `assertConfig()` guard; a missing
  UA gets a dev default `GardeManger/0.0.1 (dev)`). `imageHostAllowlist` =
  OFF image hosts (`images.openfoodfacts.org`, `static.openfoodfacts.org`,
  `world.openfoodfacts.net`).
- `productImageDir(): string` — `PRODUCT_IMAGE_DIR` or derive from
  `dirname(DATABASE_PATH) + '/product-images'` (spec §331: images live in the
  data dir beside the DB). `mkdirSync(..., { recursive: true })` on first use.
- `diskImageStore: ImageStore` — writes `<imageDir>/<barcode>.<ext>` (ext from
  content-type; default `.jpg`), returns the **relative** path stored in the DB.
- Update `.env.example`: add `OFF_USER_AGENT="GardeManger/0.0.1 (you@example.com)"`
  and (commented) `OFF_HOST`, `PRODUCT_IMAGE_DIR`.

---

## Task 5 — `inventory.addPackaged` + packaged name/image resolution

In `src/lib/server/inventory.ts`:

```ts
export function addPackaged(db, params: {
  householdId; addedBy; barcode: string;
  productName?: string | null;   // stored in customName when product unknown / for snapshot
  useByDate?: Date;              // DLC (red, the core of the packaged flow)
  quantity?: number; location; notes?: string | null;
}): InventoryItem  // kind='packaged', foodId=null, isEstimate=false
```

- Home name/thumbnail resolution: in `(app)/+page.server.ts`, after `listActive`,
  batch-fetch `products` for the set of packaged-item barcodes (one
  `inArray(products.barcode, …)` query — no N+1). Resolve display name:
  packaged → `product.name ?? item.customName ?? barcode`; expose `imagePath`
  (→ `/products/<barcode>/image`) and `dateKind='DLC'` for packaged rows on
  `ItemRow`. Fresh/custom unchanged.
- **Test** (extend `src/lib/server/inventory.test.ts`): `addPackaged` inserts
  `kind=packaged`, barcode set, `effectiveDate` = useByDate; appears in
  `listActive`; respects household scoping in `setStatus` (already covered, but
  add a packaged-item consume/discard case).

---

## Task 6 — `/scan` route: camera island + always-visible manual fallback

- `src/routes/(app)/scan/+page.ts` → `export const ssr = true; export const csr = true;`
  (server-renders the manual fallback shell; the camera hydrates as an island).
- `src/routes/(app)/scan/+page.server.ts` `load`: `requireMembership(db,
  activeHouseholdId, user.id)` (403 on miss; `noHousehold` branch like `/add`);
  return `{ locale, activeHouseholdId }`.
- `src/routes/(app)/scan/+page.svelte`:
  - **Camera island** (Svelte 5 runes, client-only logic guarded by
    `onMount`/`browser`): `getUserMedia({ video: { facingMode: 'environment' } })`,
    draw to a downscaled offscreen canvas, decode loop ~10 fps. Decoder: lazily
    `import('barcode-detector')` (native `BarcodeDetector` where present, ZXing
    WASM fallback). Formats `['ean_13','ean_8','upc_a','upc_e']`. Require the
    **same normalized code on 2 consecutive frames**, then `goto('/scan/' +
    code)` (stop the stream first). Show live status (searching / found).
  - **Manual entry — ALWAYS visible** (not hidden behind a camera error): a
    plain form/`<a>` that navigates to `/scan/<barcode>` for a typed barcode
    (client-validate with `isValidBarcode`), plus a link to `/add` (saisie
    libre) for name entry. Spec §6.1: the manual link is always visible.
  - **Graceful degradation:** insecure context / `getUserMedia` undefined /
    permission denied → calm message + the manual path stays. No dead-ends.
  - Use `resolve()` for internal nav targets (lint rule).
- i18n keys: scan title, instructions, "autoriser la caméra", denied message,
  manual-entry label/placeholder, "saisir le code", link to free text.

---

## Task 7 — `/scan/[barcode]` confirm page (server-rendered, zero-JS form)

- `src/routes/(app)/scan/[barcode]/+page.ts` → `csr = false` (zero-JS form).
- `+page.server.ts` `load`:
  - `normalizeBarcode(params.barcode)`; invalid → `error(400)`.
  - `requireMembership(...)` (403 / `noHousehold`).
  - `try { const product = await lookupProduct(db, code, getOffConfig(), {
    imageStore: diskImageStore }) } catch (OffUnavailable) { → render manual
    variant with an "OFF indisponible" notice }`.
  - Return `{ barcode, product: found|not_found|null, offUnavailable }`.
- `+page.svelte`: confirm form, prefilled:
  - **found:** name + brand + image thumbnail (`/products/<barcode>/image`);
    name read-only-ish (editable allowed). **Required DLC date input, rendered
    in red** (the product's core idea: the red hard date you type vs the amber
    soft date we estimate). Quantity (default 1), location select. **OFF
    attribution** shown: data © OFF contributors (ODbL), image CC-BY-SA 3.0.
  - **not_found / offUnavailable:** same form but with an editable **name**
    field (prefilled empty), no image, a "produit inconnu — saisie manuelle"
    note. Still `kind=packaged` with the typed name → `customName`.
  - Action `addPackaged`: valibot-validate (barcode, optional name, **useByDate
    required** `YYYY-MM-DD`, quantity, location); resolve household exactly like
    `/add` actions (cookie → `resolveActiveHouseholdId` → `requireMembership`);
    `addPackaged(...)`; `redirect(303, '/')`.
- i18n keys for all of the above.

---

## Task 8 — Product image serving `(app)/products/[barcode]/image/+server.ts`

- `GET`: **require `locals.user`** (401 if absent — `+server.ts` endpoints do
  NOT run the `(app)` layout auth, so check explicitly).
- `normalizeBarcode(params.barcode)`; look up the `products` row; if no row or
  no `imagePath` → `404`.
- Resolve the file **only** within `productImageDir()` (guard against path
  traversal: reject if the resolved path escapes the dir; the stored path is our
  own `<barcode>.<ext>`, but validate anyway). Read bytes, return with the
  stored content-type and `Cache-Control: public, max-age=31536000, immutable`.
- No directory listing, no arbitrary path input — barcode-keyed lookup only.

---

## Task 9 — Wire scan into the add-sheet + home thumbnails

- `(app)/add/+page.svelte`: replace the disabled "scanner (bientôt M3)" card
  with an active link to `/scan`. Remove the `add_method_scanner_soon` usage
  (keep or repurpose the key; drop if unused so parity stays clean).
- `(app)/+page.svelte`: render OFF photo thumbnails for packaged rows (from Task
  5's `imagePath`), `loading="lazy"`, with sensible alt text; keep the urgency
  banding/layout intact. Fresh/custom rows unchanged.

---

## Task 10 — Self-hosted ZXing WASM + bundle discipline

- Add the `barcode-detector` dependency (bundles the ZXing-C++ WASM fallback).
- Ensure the decoder is **lazy-loaded only on `/scan`** via dynamic `import()`
  so the ~1 MB WASM stays out of the main bundle (spec §72/§8).
- Self-host the WASM (no third-party CDN at runtime — frugal + offline-friendly
  + CSP-clean). Configure so the `.wasm` is emitted as a static asset and
  served as `application/wasm`. (PWA precache of the WASM is M4; here just make
  sure it loads and is same-origin.)
- Verify `bun run build` still succeeds under Bun (the `bunx --bun vite build`
  invariant) and that the main bundle does not balloon with WASM.

---

## Task 11 — Final review + merge

- **Spec-compliance review** (fresh subagent): every §6.1/§9 bullet present —
  cache-first, 1-scan-≤-1-call, not_found TTL, UA header, ODbL separation,
  manual fallback always visible, red DLC, OFF attribution, image stored locally.
- **Security review (opus):** path traversal on the image endpoint; auth on the
  image endpoint; SSRF on image download (host allowlist); barcode input
  validation everywhere it reaches a fetch/path; confirm cache-first can't be
  bypassed to hammer OFF (e.g. `not_found` TTL not too short, no per-request
  forced refresh); CSRF still ON; no `$env` in `off.ts`; no OFF data leaking
  into `foods`/`shelf_lives`.
- Apply fixes; re-run the full gate.
- **Merge gate:** `bun run lint && bun run check && bun test` all green.
- **Manual-test note (like passkeys):** live camera scanning can't be
  curl-tested — needs a real device over HTTPS (or `localhost`). Document the
  manual smoke steps; the cache-first/OFF/parse logic is fully unit-tested with
  a fake fetch.
- Merge to `main` locally, push to origin (user authorized pushing to main).

---

## Acceptance (M3 done when)

1. `/scan` opens the rear camera on a supported device, decodes EAN/UPC, and
   navigates to a prefilled confirm page; manual barcode entry works without a
   camera and is always visible.
2. A confirmed packaged product is added with a **required red DLC date** and
   shows on the urgency-first home with its OFF name + thumbnail.
3. OFF is hit **at most once per genuine miss**; re-scans and `not_found` (within
   TTL) hit cache; OFF being slow/down degrades to manual entry, never a hang.
4. Images are stored on the volume and served same-origin behind auth; OFF
   attribution is visible; no OFF data is written into the curated catalogue.
5. `bun run lint && bun run check && bun test` green; new pure tests cover
   barcode normalization and the OFF cache-first/TTL/SSRF/timeout behaviour with
   zero network access.
