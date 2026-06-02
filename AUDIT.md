# garde-manger — Codebase Audit

> Multi-agent audit: 12 subsystems reviewed, every finding independently verified by two agents (mechanism + reachability/impact lenses). Only findings both verifiers confirmed appear under **Confirmed**.

**Coverage:** 12 subsystems · 37 raw findings → **24 confirmed**, 10 disputed (verifier split).

## Resolution status (all addressed)

- **3 high** — fixed (open redirect, service-worker data leak, invitation GET/CSRF).
- **4 medium** — fixed (send-time SSRF re-validation, indexed invitation lookup, FK/lookup indexes, passkey-cancel detection).
- **2 disputed-high** — fixed (item date-field clearing; user-delete FK onDelete).
- **17 low** — fixed, with one deliberate exception: the EAN-8/UPC-E 8-digit ambiguity (`barcode.ts`) is genuinely unresolvable without context; we keep the existing UPC-E precedence and **document** the residual ambiguity (the audit explicitly permits documenting either way) rather than flip behavior and break real UPC-E scans.

## Executive summary

The codebase is, on the whole, thoughtfully built: the auth layer uses WebAuthn correctly in its core flow, household scoping is enforced at call sites, the service worker explicitly avoids caching /api and session-boundary routes, and there is a real SSRF allowlist for push endpoints. Most findings (16 of 24) are genuinely low-severity quality/correctness nits. However, the audit surfaces three legitimately serious defects that cluster around the boundary between "server-enforced security" and "client/edge behavior that bypasses it": an open redirect in safeLocalPath (the one function whose entire job is to prevent that), authenticated household pages cached in a user-agnostic service-worker cache (defeating its own stated guarantee on a shared device), and a single-use invitation accepted via a GET load() with no CSRF protection (burnable by prefetch, forceable cross-site). A second tier of medium issues is real but bounded: blind SSRF because the push guard is never re-checked at send time, a full-table scan on every invitation accept, and missing FK indexes on hot auth/push paths. Risk posture is "solid core, leaky edges" — the dangerous bugs are not in the cryptographic auth primitives but in the supporting validation, caching, and invitation-acceptance plumbing. None are deep architectural rot; all three high items are small, surgical fixes.

## Top priorities

1. 🟠 **Open redirect in safeLocalPath via backslash-prefixed path (e.g. /\evil.com)** — `src/lib/validation.ts`  
   It is a one-line fix to the single function whose documented purpose is preventing open redirects, and it sits directly on the post-login redirect path — the highest-value target for phishing and token harvesting. The check only rejects '//' but browsers treat backslashes as forward slashes, so /\evil.com (and %5C variants) escape the guard. Highest impact-to-effort ratio in the whole audit.

2. 🟠 **Service worker caches authenticated household-scoped pages in a user-agnostic DYNAMIC cache** — `src/service-worker.ts`  
   networkFirst() caches any same-origin 2xx navigation that is not under the NETWORK_ONLY_PREFIXES list, which includes the authenticated app shell, inventory, email and passkey-list pages. On a shared or stolen device a second person can read the prior user's data offline, directly contradicting the file's own 'NEVER persist another user's data' comment. The session gate is server-only and never re-runs offline. Fix is contained (don't cache authenticated routes / scope or purge by user) but the data-exposure blast radius is large.

3. 🟠 **Invitation accepted via GET in load() — single-use token, no CSRF protection** — `src/routes/join/[token]/+page.server.ts`  
   acceptInvitation() runs inside load(), which is a GET and not CSRF-protected unlike form actions. A link prefetch/hover-preload silently burns the single-use token before the user clicks, breaking the legitimate join flow; worse, an attacker can force an authenticated user to join an arbitrary household via a cross-site GET. The correct fix (move acceptance into a POST form action with an explicit confirm step) is a clear, well-scoped change.

4. 🟡 **Blind SSRF: push endpoint safety re-validated only at subscribe time, never at send** — `src/lib/server/push.ts`  
   isSafePushEndpoint() is enforced once at /api/push/subscribe and never re-checked in sendToSubscription()/webPushSender. Because it is a literal-string check it is bypassable by DNS rebinding and stored values, letting the cron worker POST to internal/cloud-metadata hosts (169.254.169.254 is in range but the guard runs at the wrong time). Bounded to blind SSRF (encrypted body, no response returned, 20-sub cap), so medium not high. Re-validate at send time to close it.

5. 🟡 **acceptInvitation loads the entire invitations table and scans in app code** — `src/lib/server/invitations.ts`  
   Confirmed: db.select().from(invitations).all() then a JS .find() on every join. This is on the same hot path as the GET-accept bug above, so fix them together — query by tokenHash with a WHERE/index. CPU/memory grow linearly with table size, giving an unauthenticated-adjacent resource-exhaustion lever on the join endpoint.

6. 🟡 **Missing indexes on foreign-key columns used for hot lookups and cascade deletes** — `src/lib/server/db/schema.ts`  
   sessions.userId, credentials.userId, pushSubscriptions.userId, memberships.userId, invitations.householdId and inventory FKs are unindexed, forcing O(n) scans on the auth resolution path (session/credential lookup runs on nearly every request) and during cascade deletes. Cheap, low-risk migration with broad scalability payoff; worth batching before the data grows.

## Confirmed findings

## 🟠 High (3)

### 🟠 [HIGH/security] Service worker caches authenticated, household-scoped pages in a user-agnostic DYNAMIC cache

- **File:** `src/service-worker.ts` — fetch handler ~L75-97 and networkFirst() ~L116-148
- **What & why:** NETWORK_ONLY_PREFIXES only lists ['/api','/internal','/logout','/login']. The authenticated app routes /garde-manger, /cuisiner, /bilan and /account are NOT excluded, so they fall through to networkFirst(), which stores any response.ok GET into the DYNAMIC cache keyed by URL only (cache.put(request, clone), L129). These pages are server-rendered with the active user's data: /account contains the user's email, displayName and full passkey credential list (account/+page.svelte renders data.user.\* and credentials), and /garde-manger contains the household inventory. The cache key is the URL, with no per-user namespacing, so on a shared device the cached HTML of user A remains readable offline. The only mitigation is clearDynamic() which fires solely on a navigation to /login or /logout (L82-84). That purge depends on a live network navigation actually reaching the SW: if the device is offline at sign-out/session-expiry, or if user B opens a deep link to /garde-manger while offline before ever hitting /login, networkFirst() serves user A's cached authenticated page.
- **Impact:** On a shared or stolen device, another person can read the previous user's email, passkey list and full pantry inventory offline by navigating directly to cached authenticated routes, bypassing the session gate (which only runs server-side). The 'NEVER persist another user's data' guarantee stated in the file comments does not hold for the primary app routes.
- **Fix:** Treat authenticated HTML navigations as network-only (do not store them in DYNAMIC), or scope the dynamic cache to the session: include the session/household identity in the cache key, and purge unconditionally on the activate event and on any 401/redirect-to-login response. Minimal change: in networkFirst, only cache responses for an explicit allowlist of non-sensitive paths, and add /account (and any page rendering user/household data) to NETWORK_ONLY_PREFIXES.

### 🟠 [HIGH/security] Invitation accepted via GET in load() — single-use token consumed by prefetch/hover preload

- **File:** `src/routes/join/[token]/+page.server.ts` — load() ~L8-46
- **What & why:** acceptInvitation() performs DB writes (inserts a membership, marks the invite usedAt) inside a SvelteKit load function, which executes on every GET to /join/<token>. This violates the rule that state changes must not happen on safe/idempotent GETs. The app sets data-sveltekit-preload-data="hover" in src/app.html, so merely hovering a /join link (or SvelteKit speculative preload, browser prefetch, link-preview bots, email/AV scanners, or the user reloading the page) fires the load and consumes the single-use invitation before the recipient ever clicks. Because invites are single-use (usedAt set), the legitimate recipient then gets an already_used error. It is also a CSRF-like vector: a third party who knows/guesses a token can cause an authenticated victim's browser to auto-join a household just by getting them to load a page containing the link.
- **Impact:** Invitations get silently burned by prefetch/hover before use, breaking the join flow; authenticated users can be made to join arbitrary households via a GET with no CSRF protection (load functions are not CSRF-protected, unlike actions).
- **Fix:** Move the mutation into a form action (POST), which SvelteKit CSRF-protects, and have load() only validate/display the invite (read-only: look up by hash, check expiry/used, show a confirm button). The POST action then calls acceptInvitation(). At minimum, never write to the DB from load().

### 🟠 [HIGH/security] safeLocalPath allows open redirect via backslash-prefixed path

- **File:** `src/lib/validation.ts` — safeLocalPath() L7-11
- **What & why:** The guard accepts any string that startsWith('/') and not startsWith('//'). It does not account for backslashes. An input like "/\\evil.com" passes the check and is returned unchanged. This value flows into SvelteKit's redirect(303, redirectTo) in src/routes/(auth)/login/+page.server.ts:43 and signup/+page.server.ts:53, becoming a Location response header. Per the WHATWG URL spec, browsers normalize backslashes to forward slashes in URL paths, so the browser treats Location: /\evil.com as //evil.com — a protocol-relative URL that navigates to the external host evil.com. I verified with node: safeLocalPath('/\\evil.com') returns '/\evil.com' (not the fallback). The redirectTo is fully attacker-controlled via the ?redirectTo= query string / form field on the login and signup pages.
- **Impact:** Open redirect on the authentication flow. An attacker can craft a login/signup link (e.g. /login?redirectTo=/\evil.com) that, after the user authenticates, redirects them to an attacker-controlled site — usable for phishing and credential/token harvesting. This defeats the exact attack the function is documented to prevent.
- **Fix:** Reject backslashes (and control chars) in the local-path check, e.g. const isLocal = (s) => s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') && !/[\\ -]/.test(s); Or canonically: treat as local only if new URL(s, 'http://x').origin === 'http://x' and the resulting pathname starts with '/'. The minimal fix is adding && s[1] !== '\\' && !s.includes('\\') to the isLocal predicate.

## 🟡 Medium (4)

### 🟡 [MEDIUM/quality] acceptInvitation loads the entire invitations table and scans in app code

- **File:** `src/lib/server/invitations.ts` — acceptInvitation() ~L56-64
- **What & why:** Lookup is done by `db.select().from(invitations).all()` then `Array.find` comparing tokenHash buffers in JS, instead of querying `where(eq(invitations.tokenHash, hash))`. The comment about 'compare as hex strings' is stale/incorrect (it uses Buffer.equals). This loads every invitation row (including other households' rows) into memory on each join attempt — O(n) memory and CPU per request, unbounded growth, and a DoS amplification surface as the table grows.
- **Impact:** Linear scan of all invitations on every join; memory/CPU grows with table size, enabling resource exhaustion and degrading the join path.
- **Fix:** Query directly: `const invite = db.select().from(invitations).where(eq(invitations.tokenHash, hash)).get();`. The tokenHash column should also have an index (or unique constraint) added in schema/migration.

### 🟡 [MEDIUM/correctness] Passkey cancellation detection checks err.message instead of err.name, so cancelling always shows an error

- **File:** `src/lib/components/PasskeyEnroll.svelte` — handleEnroll() catch block ~L40-47 (identical bug in PasskeyLogin.svelte handleLogin() ~L42-49)
- **What & why:** On user cancellation, @simplewebauthn/browser's startRegistration/startAuthentication throw a WebAuthnError whose .name is the DOMException name (e.g. 'NotAllowedError') and whose .code is 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY'. The human-readable .message is just the underlying DOMException message (verified: identifyRegistrationError.js line 65 uses `message: error.message`), which for cancellation reads like 'The operation either timed out or was not allowed in the specified context.' — it does NOT contain the literal substrings 'NotAllowedError', 'cancelled', or 'aborted'. The component does `msg = err.message` and checks `msg.includes('NotAllowedError') || msg.includes('cancelled') || msg.includes('aborted')`. That condition is essentially never true for a real cancellation, so the 'stay silent' branch is dead code and every cancel/timeout falls through to errorMessage = 'Enregistrement annulé ou non supporté.' / 'Passkey non reconnue ou annulée.'
- **Impact:** Users who simply dismiss the OS passkey prompt (the most common non-success path) are shown a failure/error message, implying something broke. Confusing UX on the core auth flow.
- **Fix:** Inspect the error name/code, not the message. e.g. `const name = err instanceof Error ? err.name : ''; if (name === 'NotAllowedError' || name === 'AbortError' || (err as { code?: string })?.code === 'ERROR_CEREMONY_ABORTED') { /* silent */ } else { errorMessage = ... }`. Apply the same change in both PasskeyEnroll.svelte and PasskeyLogin.svelte.

### 🟡 [MEDIUM/quality] No index on foreign-key columns used for lookups and cascade deletes

- **File:** `src/lib/server/db/schema.ts` — sessions.userId L18-20, credentials.userId L65-67, memberships.userId L39-41, invitations.householdId/createdBy L50-57, inventoryItems.addedBy/foodId L112-117, shelfLives.foodId L92-94, pushSubscriptions.userId L158-160
- **What & why:** SQLite does NOT automatically create an index for a foreign-key column (only for PRIMARY KEY / UNIQUE). The migrations confirm the only indexes that exist are: users_email_unique, credentials_credential_id_unique, memberships(household_id,user_id) unique, push_subscriptions_endpoint_unique, and inv_household_status_eff. That means common access paths have no supporting index: looking up sessions/credentials/push_subscriptions by user_id, shelf_lives by food_id, inventory_items by food_id or added_by. Worse, every ON DELETE CASCADE (e.g. deleting a household cascades to inventory_items, memberships, invitations) forces SQLite to do a full table scan of the child table per deleted parent row to find rows to cascade, because no index covers the FK child column on its own (the memberships composite unique starts with household_id so household cascade is covered, but the user-side cascades and shelf_lives.food_id cascade are not). credentials.userId, sessions.userId, pushSubscriptions.userId scans run on every user delete; shelf_lives.foodId scan runs on every food delete.
- **Impact:** O(n) scans on session/credential/push/shelf-life lookups and during cascade deletes, growing with table size. On the hot auth path (resolving credentials/sessions by user) this degrades as the DB grows. Not a correctness bug, but a real scalability/quality defect for a storage layer.
- **Fix:** Add indexes for the FK child columns that are queried or cascade-deleted independently of an existing leading-column index: index on sessions(user_id), credentials(user_id), push_subscriptions(user_id), shelf_lives(food_id), inventory_items(food_id) and inventory_items(added_by) if those are joined/filtered. Add them in the table definitions via `index('...').on(t.userId)` and generate a migration.

### 🟡 [MEDIUM/security] SSRF guard relies on subscribe-time string check only; bypassed by DNS rebinding and non-literal hostnames

- **File:** `src/lib/server/push.ts` — isSafePushEndpoint() ~L138-147, isPrivateOrLocalHost() ~L104-130; enforced only at subscribe time (src/routes/api/push/subscribe/+server.ts ~L15) and never re-checked in sendToSubscription()/webPushSender
- **What & why:** isSafePushEndpoint is a purely syntactic check on the URL string, run only when a subscription is saved. The daily cron (runDailyReminders -> sendToSubscription -> webPushSender.send) later POSTs the encrypted payload to the stored endpoint with no re-validation. Two gaps: (1) isPrivateOrLocalHost only inspects IPv4/IPv6 _literals_ — a normal hostname (e.g. 'metadata.internal', or any domain whose A record points at 10.x/127.0.0.1/169.254.169.254) falls through all branches and returns false, so it is accepted as safe; (2) even for a hostname that resolved to a public IP at subscribe time, the attacker controls DNS and can re-point it to a private/metadata address before the cron fires (classic DNS rebinding / TOCTOU). web-push uses the platform fetch/agent with no IP pinning and does not block redirects to private hosts either. An authenticated user can thus make the server emit POSTs to internal services or the cloud metadata endpoint.
- **Impact:** Authenticated SSRF from the cron worker to internal/cloud-metadata addresses. Blast radius is bounded (POST with an encrypted body, response status not returned to the attacker, capped at 20 subs/user), so it is a blind SSRF rather than data exfiltration, but it still reaches otherwise-unreachable internal endpoints.
- **Fix:** Resolve the endpoint host to its IP(s) and reject private/loopback/link-local ranges at send time (and ideally pin the connection to a validated public IP), not just validate the string. At minimum, re-run isSafePushEndpoint inside sendToSubscription before calling the sender, and extend isPrivateOrLocalHost to treat unresolved/non-literal hostnames conservatively by performing a DNS lookup and checking the resolved address. Disabling redirects in the web-push request is also advisable.

## ⚪ Low (17)

### ⚪ [LOW/quality] Authentication challenge cookie shares name with registration and lacks flow binding

- **File:** `src/routes/api/webauthn/authenticate/options/+server.ts` — authenticate/options/+server.ts L10-16 and register/options/+server.ts L20-26
- **What & why:** Both the registration and authentication flows store their challenge in the same cookie name 'gm_wa_chal'. The cookie carries only the raw challenge with no marker of which flow it belongs to. While each verify handler runs the correct verification routine (so a challenge cannot be cross-replayed across flows in a way that bypasses origin/RP-ID/type checks performed by @simplewebauthn), reusing one cookie for two distinct ceremonies is fragile: a concurrent registration and authentication in the same browser will clobber each other's challenge, causing confusing failures. The challenge cookie is also not bound to the user/session for the authenticate flow (acceptable for usernameless, but worth noting).
- **Impact:** Concurrent ceremonies in one browser tab/session can overwrite each other's challenge, producing intermittent verification failures. No direct auth bypass.
- **Fix:** Use distinct cookie names (e.g. 'gm_wa_chal_reg' vs 'gm_wa_chal_auth') so the two ceremonies cannot interfere.

### ⚪ [LOW/quality] updateHousehold and deleteHousehold/setMemberRole/removeMember are not household-scoped by caller authorization at the model layer

- **File:** `src/lib/server/households.ts` — updateHousehold/deleteHousehold/setMemberRole/removeMember
- **What & why:** These mutating helpers take a householdId and act on it with no membership/role check of their own; they trust the caller to have authorized. In the reviewed routes the [id] page actions do call ensureAdmin(params.id, ...) first and pass params.id (server-derived from the URL, re-checked against membership), so there is no IDOR in the current call sites. The risk is purely defensive: any future caller that forgets the ensureAdmin guard gets an unauthenticated privileged mutation. This is acceptable given the consistent guard pattern, but worth noting.
- **Impact:** No exploit in current code (all call sites guard with ensureAdmin and use server-derived params.id). Latent risk if a new caller omits the guard.
- **Fix:** Keep the current discipline; optionally pass the acting userId into these helpers and call requireMembership(..., 'admin') inside them so authorization cannot be forgotten by a caller.

### ⚪ [LOW/quality] Non-urgent item lifecycle actions are reachable only via pointer swipe (no keyboard path)

- **File:** `src/lib/components/ui/ItemRow.svelte` — ItemRow.svelte ~L63-93 + SwipeActions.svelte pointer handlers ~L30-61
- **What & why:** ItemRow renders inline 'ate'/'tossed' buttons only when item.band === 'urgent' (L80-91). For all other items, the consume/discard actions live solely inside SwipeActions, which is driven entirely by pointer events (onpointerdown/move/up). The action buttons are deliberately given tabindex=-1 and aria-hidden while the drawer is closed (SwipeActions L64,72), and there is no keyboard gesture to open the drawer. So a keyboard-only user cannot consume/discard a non-urgent item from the list. The detail page link `/item/${item.id}` (L65) is a fallback, which lowers severity, but the list-level action is pointer-exclusive.
- **Impact:** Keyboard-only and some assistive-tech users cannot perform the primary inventory actions from the list for non-urgent items; they must navigate into each item's detail page.
- **Fix:** Either always render the inline form-submit buttons (they already work with no JS via form= and are the urgent path) for all rows, visually de-emphasized, or expose a keyboard-accessible disclosure (e.g. a focusable 'more actions' button) that opens the same swipe drawer so the SwipeActions buttons become tabbable.

### ⚪ [LOW/security] secretMatches leaks cron secret length via early-return timing oracle

- **File:** `src/lib/server/cron.ts` — secretMatches() ~L106-112
- **What & why:** The function returns false immediately when a.length !== b.length, before any constant-time comparison. timingSafeEqual is only reached for equal-length inputs. An attacker who can measure response timing of the cron endpoint (POST /internal/cron/check-expiry with attacker-controlled x-cron-secret / Authorization) can distinguish a wrong-length guess (fast, no timingSafeEqual) from a correct-length-but-wrong-content guess (slower), narrowing the secret length. The length guard is required because timingSafeEqual throws on unequal-length buffers, but the current shape exposes the length. Impact is bounded because CRON_SECRET is expected to be high-entropy, so this is not directly exploitable to recover the secret, but it is a real, avoidable side channel on an authentication check.
- **Impact:** Timing side channel reveals the configured CRON_SECRET length to an unauthenticated caller; reduces brute-force search space for a weak/short secret. Not a full bypass.
- **Fix:** Compare fixed-length digests instead of raw buffers so length never affects the path: hash both sides (e.g. crypto.createHash('sha256').update(value).digest()) and timingSafeEqual the two 32-byte digests; still short-circuit on presented == null only. This keeps the comparison length-independent.

### ⚪ [LOW/correctness] Daily cron sends push notifications sequentially with no per-request timeout

- **File:** `src/lib/server/cron.ts` — runDailyReminders() ~L69-95 (via sendToSubscription -> webPushSender)
- **What & why:** runDailyReminders iterates users and their subscriptions and awaits each sendToSubscription one at a time. The underlying webPushSender (src/lib/server/webPushSender.ts) calls webpush.sendNotification with only a TTL set and no request timeout. A push service endpoint that accepts the connection but responds very slowly (or hangs) will block the entire cron run on that one subscription, since sends are strictly serial. With many subscriptions this also makes the total run time the sum of all round-trips. Endpoints are constrained to public push services by isSafePushEndpoint, so this is an availability/robustness concern rather than an injection vector.
- **Impact:** A single slow/hanging push endpoint can stall or greatly delay the entire daily reminder run, and the request handler has no timeout bound; long runs may also hit platform request timeouts.
- **Fix:** Add an explicit timeout to the web-push call (wrap webpush.sendNotification in a Promise.race with a timeout, or pass a timeout option) and treat a timeout as a soft 'failed' outcome. Optionally bound concurrency with a small parallel batch (e.g. Promise.allSettled over chunks) instead of fully serial awaits.

### ⚪ [LOW/quality] Stale/contradictory doc comment in usersToNotify references a 'ms-epoch column' while code uses seconds

- **File:** `src/lib/server/reminders.ts` — usersToNotify() doc comment ~L15-25 and SQL ~L40
- **What & why:** The function correctly computes todayStartSec in seconds and compares against effective_date, which Drizzle stores in seconds for integer({mode:'timestamp'}) columns (verified: mapToDriverValue does Math.floor(getTime()/1000)). The generated effective_date = coalesce(use_by_date,best_by_date) therefore also holds seconds, so the cutoff effective_date < todayStartSec + (warnDays+1)\*86400 is arithmetically correct and matches bandFor's start-of-day urgent+soon semantics (no off-by-one). However the doc comment states the equivalence holds 'on the raw ms-epoch column', which is wrong and directly contradicts the SECONDS_PER_DAY logic just below it. This is a maintenance hazard: a future reader trusting the comment could 'fix' the units and break the query.
- **Impact:** No runtime bug today, but the misleading comment about ms vs seconds invites an incorrect future change that would silently mis-window expiry notifications.
- **Fix:** Update the comment to say the column stores Unix seconds (consistent with SECONDS_PER_DAY) and remove the 'ms-epoch column' phrasing.

### ⚪ [LOW/correctness] Update action accepts unvalidated location value

- **File:** `src/routes/(app)/item/[id]/+page.server.ts` — update action ~L92
- **What & why:** `const location = fd.get('location') as 'pantry' | 'fridge' | 'freezer';` casts the raw form value straight to the union with no validation, then passes it to updateItem which writes it to the `location` column. All other flows (add/addCustom/addPackaged) validate location with `v.picklist(['pantry','fridge','freezer'])`. The schema column has an enum but Drizzle/SQLite does not enforce text enums at the DB level, so an arbitrary or empty string can be persisted into location. A null/empty submission writes garbage; a missing field writes the string 'null'/empty.
- **Impact:** Inventory rows can get an invalid location, which then fails the `location === 'pantry'|...` filter on the garde-manger list and the per-location estimate logic, effectively hiding the item from location-filtered views. Low severity (requires crafted/altered form) but trivially avoidable.
- **Fix:** Validate location with the same `v.picklist([...])` schema (or an inline check) before building the patch, returning fail(400) on mismatch — mirror the add flows.

### ⚪ [LOW/correctness] Quantity validation permits 0 in add flows

- **File:** `src/routes/(app)/add/+page.server.ts` — addFreshSchema/addCustomSchema ~L113,L121; scan/[barcode] addPackagedSchema ~L83
- **What & why:** Quantity is validated only with `v.regex(/^\d+$/)` and then `parseInt(quantity, 10)`. `/^\d+$/` matches '0' and very large numbers. So addFresh/addCustom/addPackaged can create items with quantity 0 (or absurdly large). The item edit action by contrast clamps with `Math.max(1, parseInt(...) || 1)`, so the add and edit paths are inconsistent.
- **Impact:** Items can be added with quantity 0, which is semantically meaningless for inventory and inconsistent with the clamp applied on edit. Minor data-quality issue.
- **Fix:** Tighten the schema to require >= 1, e.g. transform to number and `v.minValue(1)`, or apply `Math.max(1, ...)` like the edit action does before passing to add\*.

### ⚪ [LOW/security] OFF product JSON response is parsed with no size bound

- **File:** `src/lib/server/off.ts` — lookupProduct() ~L231-236
- **What & why:** After the product fetch, the body is consumed via `await res.json()` with no upper bound on body size. Like the image path, the response is buffered fully into memory before parsing. The host is operator-config (OFF_HOST) and normally trusted, but a compromised/spoofed upstream or a man-on-the-side on a non-pinned connection could return an arbitrarily large JSON body and OOM the process. Lower severity than the image case because the host is not user-influenced and OFF is generally trusted.
- **Impact:** Potential memory-exhaustion DoS if the configured OFF host returns an unbounded body. Single shared process, so it affects all scanning.
- **Fix:** Cap the product response too: check content-length, and/or stream with a max-bytes limit (e.g. reuse the same bounded-read helper) before JSON.parse, throwing OffUnavailable when exceeded.

### ⚪ [LOW/security] Outbound OFF rate limit is global, not per-user — one member can starve scanning for everyone

- **File:** `src/lib/server/offRateLimit.ts` — createOffRateLimiter()/offRateLimitGuard ~L16-32
- **What & why:** `offRateLimitGuard` is a single process-wide sliding window of 12 live OFF calls / 60s, invoked via beforeOffCall only on cache misses. There is no per-user or per-household sub-limit. Any one authenticated household member who scans 12 distinct uncached barcodes within a minute consumes the entire global budget, after which every other user across all households gets OffUnavailable (forced manual entry) for the remainder of the window. The not_found TTL (1 week) does limit repeated misses on the same barcode, but distinct barcodes are unbounded per user. This is a documented tradeoff in the module comment, but it is an authenticated cross-tenant availability issue worth recording.
- **Impact:** An authenticated, semi-trusted member can degrade OFF lookups (auto-fill of product name/brand/image) for all households by rapidly scanning distinct barcodes. Not data exposure; availability/quality-of-service only.
- **Fix:** Add a cheap per-user (or per-household) token bucket in front of the global limiter so a single actor cannot consume the whole shared budget, e.g. cap each user to N misses/min while keeping the global 12/60s ceiling.

### ⚪ [LOW/quality] Downloaded image content-type is not validated to be an image

- **File:** `src/lib/server/off.ts` — maybeDownloadImage() ~L159-160 / src/lib/server/productConfig.ts diskImageStore ~L77-84
- **What & why:** The response content-type is taken verbatim from the upstream header and passed to the store, which maps unknown types to a `.jpg` extension and writes the bytes. There is no check that the body is actually image/_ . A non-image body (e.g. text/html from an allowlisted host quirk) would be persisted and later served. The serving route (image/+server.ts) re-derives content-type from the file extension and only ever emits image/_ with no inline HTML rendering, so this is not an XSS vector, but storing arbitrary non-image bytes as product images is incorrect and wastes disk.
- **Impact:** Low: junk/non-image content cached as a product image; no XSS because the serving route forces an image content-type from a fixed allowlist of extensions. Mostly a correctness/data-hygiene issue.
- **Fix:** Reject the download when the response content-type does not start with `image/` (after stripping parameters), returning null so the lookup proceeds without an image.

### ⚪ [LOW/correctness] vapidPublicKey() serves the dev key in production while getVapid() throws, silently breaking delivery

- **File:** `src/lib/server/pushConfig.ts` — vapidPublicKey() ~L47-49 vs getVapid() ~L28-44
- **What & why:** getVapid() throws in production (!dev) when any VAPID\_\* env var is missing, but vapidPublicKey() returns env.VAPID_PUBLIC_KEY || DEV_VAPID_PUBLIC with no production guard. If a production deploy is missing the VAPID env vars, the client is handed the throwaway DEV public key, the browser subscribes successfully bound to that key, but the cron's getVapid() throws on first run. Subscriptions are persisted yet can never be delivered, and the misconfiguration is invisible until the daily job errors.
- **Impact:** Misconfigured production silently accepts push subscriptions that can never receive notifications; no early failure surfaces the missing config. Not a secret leak (the public key is meant to be public).
- **Fix:** Make vapidPublicKey() consistent with getVapid(): in production (!dev) throw / return empty when env.VAPID_PUBLIC_KEY is unset, or derive both from a single validated config so the dev fallback can never leak into production behavior.

### ⚪ [LOW/quality] failureCount is incremented but never used to prune persistently failing subscriptions

- **File:** `src/lib/server/push.ts` — incrementFailure() ~L268-279; sendToSubscription() ~L264
- **What & why:** On any non-2xx/non-410 status or a thrown transport error, failureCount is incremented and the row is kept. No code path ever reads failureCount to evict a subscription after N consecutive failures (confirmed: only tests and the increment/reset sites reference it). Endpoints that consistently fail with statuses other than 404/410 (e.g. repeated 5xx, or a permanently broken endpoint that never returns gone) accumulate failures forever and are retried on every daily run.
- **Impact:** Table bloat and wasted cron fan-out (and unnecessary SSRF-surface POSTs) to permanently dead endpoints. Bounded by the 20/user cap, so low impact.
- **Fix:** Add a failure threshold (e.g. delete the row once failureCount exceeds a small limit such as 10) inside sendToSubscription's failure branch, mirroring the 'pruned' path.

### ⚪ [LOW/correctness] Genuine EAN-8 codes starting with 0/1 are silently reinterpreted as UPC-E

- **File:** `src/lib/barcode.ts` — normalizeBarcode() case 8: L87-97
- **What & why:** For an 8-digit input whose first digit is 0 or 1, the code first attempts UPC-E expansion and, if the expanded EAN-13 passes the check digit, returns that EAN-13 — only falling back to treating it as a real EAN-8 if the UPC-E path fails. A single 8-digit string can be both a valid EAN-8 and a valid UPC-E encoding (the check-digit algorithms differ, so collisions exist). I brute-forced all 8-digit codes starting with 0/1: ~1.16M values are simultaneously a valid EAN-8 and yield a valid EAN-13 via the UPC-E path, so for those the function returns the EAN-13 form, discarding the EAN-8 interpretation. The heuristic is documented and the colliding values are mostly not real GS1-8 product codes, so practical impact is small, but the ambiguity is resolved unconditionally in favor of UPC-E with no signal to the caller.
- **Impact:** A rare genuine EAN-8 product whose digits also happen to form a valid UPC-E will be normalized to the wrong (UPC-A/EAN-13) code, causing an Open Food Facts lookup miss or a wrong product match. Low likelihood given real EAN-8 GS1 prefixes.
- **Fix:** Prefer the unambiguous interpretation: if the 8-digit code is itself a valid EAN-8, return it as-is; only fall back to UPC-E expansion when the EAN-8 check fails. I.e. test isValidBarcode(code) first, and attempt upcEToUpcA only if that fails. (Document the residual ambiguity either way.)

### ⚪ [LOW/security] Registration and authentication share one challenge cookie name (gm_wa_chal) with no purpose binding

- **File:** `src/routes/api/webauthn/register/options/+server.ts` — register/options POST L20-26, authenticate/options POST L10-16 (and both verify handlers reading cookies.get('gm_wa_chal'))
- **What & why:** Both the registration and authentication option endpoints write the same cookie name 'gm_wa_chal', and both verify endpoints read that same cookie. The cookie carries only the raw challenge value with no marker for which ceremony it belongs to. Cross-ceremony confusion is ultimately blocked by @simplewebauthn (an attestation/registration response will not verify as an assertion/authentication response and vice-versa, and origin/RPID are checked), so there is no concrete bypass. However, concurrent ceremonies in the same browser (e.g. user opens the add-passkey page while an unauthenticated login tab is open) clobber each other's challenge, producing confusing verification failures, and the shared name removes a layer of defense-in-depth.
- **Impact:** No authentication bypass found; impact is robustness/clarity and loss of defense-in-depth. Concurrent ceremonies can fail unexpectedly.
- **Fix:** Use distinct cookie names per ceremony (e.g. 'gm_wa_reg_chal' and 'gm_wa_auth_chal') so the two flows cannot read each other's challenge and concurrent ceremonies do not collide.

### ⚪ [LOW/correctness] Duplicate credential registration is silently reported as a verification failure

- **File:** `src/lib/server/auth/webauthn.ts` — verifyRegistration() L115-137 (UNIQUE constraint catch), surfaced at register/verify/+server.ts L47-49
- **What & why:** When the WebAuthn response is cryptographically valid but the credentialId already exists (the user re-registers an authenticator they already enrolled), the insert hits the UNIQUE constraint on credentials.credential_id and the catch returns { verified:false }. The route then responds 400 'Vérification échouée', which is indistinguishable from a real cryptographic failure. The unique constraint is global, so the same physical authenticator already bound to another account would also yield a generic failure. Because registrationOptions already passes excludeCredentials for the current user, this path is mostly defensive, but the conflated error makes legitimate re-registration look like a tampering/verification error.
- **Impact:** Confusing UX and harder debugging; not exploitable. A correct (already-registered) passkey is reported as failed verification.
- **Fix:** Distinguish the duplicate case: on UNIQUE violation return a typed result (e.g. { verified:false, reason:'duplicate' }) and have the route respond with a clear 409/'already registered' message instead of generic 400 verification-failed.

### ⚪ [LOW/security] Authentication options use userVerification 'preferred', allowing session creation without user verification

- **File:** `src/lib/server/auth/webauthn.ts` — authenticationOptions() L149-153 and verifyAuthentication() L181-217
- **What & why:** generateAuthenticationOptions sets userVerification:'preferred'. With 'preferred', an authenticator may complete the assertion without performing user verification (PIN/biometric), and verifyAuthenticationResponse (called without requireUserVerification:true) will still mark it verified. The verify endpoint then mints a full 30-day session. For a passwordless-only app where the passkey is the sole authentication factor, accepting unverified assertions weakens the assurance that the human present actually unlocked the device.
- **Impact:** On a device whose passkey can assert without UV, presence alone can yield a logged-in session. For a passwordless app this lowers the auth assurance level; not a remote exploit.
- **Fix:** Set userVerification:'required' in both generateAuthenticationOptions and generateRegistrationOptions, and pass requireUserVerification:true to verifyAuthenticationResponse, unless there is a deliberate product reason to allow UV-less authentication.

## Disputed findings (verifiers disagreed — review manually)

One verifier judged these real, the other refuted them. Several are flagged high-severity by one lens, so they merit a manual second look rather than dismissal.

- 🟠 **[HIGH]** `src/routes/(app)/item/[id]/+page.server.ts` — Changing an item's date type (DLC↔DDM) leaves the old date field set, so effectiveDate stays wrong
  - Verifier A(mechanism): **REAL** (high) — Verified against actual code. schema.ts L130-133: effectiveDate is a STORED generated column `coalesce(use_by_date, best_by_date)`. In +page.server.ts update action L106-107: `if (dateKind === 'DLC') patch.useByDate = date; else if (dateKind === 'DDM') patch.bestByDate = date;` —
  - Verifier B(impact): **refuted** (high) — The code-level mechanism is real but the triggering scenario is unreachable, so the claimed impact does not occur.

Verified facts:

- schema.ts L130-131: effectiveDate IS `coalesce(use_by_date, best_by_date)` as claimed.
- inventory.ts updateItem (L252-257): only sets fields pres

- 🟠 **[HIGH]** `src/lib/server/db/schema.ts` — Deleting a user is blocked by RESTRICT foreign keys on inventory_items.added_by and invitations.created_by
  - Verifier A(mechanism): **REAL** (high) — MECHANISM is accurate. schema.ts L112-114 (inventory_items.addedBy) and L55-57 (invitations.createdBy) call .references(() => users.id) with no onDelete option, defaulting to ON DELETE no action — confirmed in generated SQL drizzle/0002_living_payback.sql:32 ("FOREIGN KEY (`added
  - Verifier B(impact): **refuted** (high) — The FK mechanism is accurately described. schema.ts L112-114 (inventoryItems.addedBy) and L55-57 (invitations.createdBy) use .references(() => users.id) with no onDelete, and the generated SQL confirms ON DELETE no action (drizzle/0002_living_payback.sql L32; drizzle/0001_furry_p

- 🟡 **[MEDIUM]** `src/lib/server/off.ts` — Image download buffers entire response body before size check (content-length bypass → OOM)
  - Verifier A(mechanism): **REAL** (high) — Verified against the actual code in /home/sbrn/Projects/garde-manger/src/lib/server/off.ts L154-158. The mechanism is exactly as described. L155: `const declared = Number(res.headers.get('content-length') ?? '0');` — when content-length is absent it defaults to 0; L156: `if (decl
  - Verifier B(impact): **refuted** (medium) — The mechanism is real as code: in maybeDownloadImage (src/lib/server/off.ts L154-158), `const declared = Number(res.headers.get('content-length') ?? '0')` yields 0 when the header is absent, which passes the `declared > MAX_IMAGE_BYTES` guard (L156); then L157 `new Uint8Array(awa

- 🟡 **[MEDIUM]** `src/lib/server/db/client.ts` — Migrations run with foreign_keys = ON, which silently breaks any future table-rebuild migration
  - Verifier A(mechanism): **REAL** (high) — The mechanism is exactly as described. In src/lib/server/db/client.ts, createDb() runs `sqlite.exec('PRAGMA foreign_keys = ON;')` at L27 unconditionally. src/lib/server/db/index.ts then calls createDb(DATABASE_PATH) and immediately runMigrations(db) on that same connection. runMi
  - Verifier B(impact): **refuted** (high) — Verified the actual code. client.ts L27 does set `PRAGMA foreign_keys = ON;` unconditionally and runMigrations (L35-37) runs drizzle's migrate on that connection — those facts are accurate. The runtime migrator (node_modules/drizzle-orm/sqlite-core/dialect.cjs L662-695) wraps all

- 🟡 **[MEDIUM]** `src/lib/components/ui/Sheet.svelte` — Modal dialogs (Sheet, ActionSheet) declare aria-modal but provide no focus management, focus trap, or scroll lock
  - Verifier A(mechanism): **REAL** (high) — Verified by reading both files in full. Sheet.svelte L30 renders `<div class="sheet" role="dialog" aria-modal="true" aria-label={title}>` and ActionSheet.svelte L41 renders the same. Neither component has any focus management code: there is no onMount/$effect, no bind:this on the
  - Verifier B(impact): **refuted** (high) — The code-level mechanism is accurate: /home/sbrn/Projects/garde-manger/src/lib/components/ui/Sheet.svelte (L28-37) and ActionSheet.svelte (L39-58) both render `<div role="dialog" aria-modal="true">` with no focus management, no focus trap, no focus restoration, and no body scroll

- 🟡 **[MEDIUM]** `src/service-worker.ts` — notificationclick opens the raw push-supplied navigate value, allowing cross-origin open-redirect
  - Verifier A(mechanism): **REAL** (high) — Verified in /home/sbrn/Projects/garde-manger/src/service-worker.ts. The mechanism is exactly as described. At L207-208 `navigate` is read verbatim from `event.notification.data.navigate` (set unvalidated from the push payload at L186: `if (typeof n.navigate === 'string') navigate
  - Verifier B(impact): **refuted** (high) — The mechanism is accurately described: in src/service-worker.ts the notificationclick handler resolves a same-origin `target = new URL(navigate, location.origin).href` (L212) used only for matching existing clients (L215), but opens the raw value via `sw.clients.openWindow(naviga

- ⚪ **[LOW]** `src/lib/server/households.ts` — setRole allows an admin to demote themselves while sole admin only blocked by count, but cross-self-demote path lets last admin escalate/leave inconsistent state — verify last-admin guard covers promotion-to-member of self
  - Verifier A(mechanism): **REAL** (high) — I read src/lib/server/households.ts. The mechanism described matches the code. The last-admin guard at L84 is exactly `if (membership.role === 'admin' && role === 'member' && countAdmins(db, householdId) <= 1)` and removeMember's at L104 is `if (membership.role === 'admin' && cou
  - Verifier B(impact): **refuted** (high) — Read src/lib/server/households.ts. The guards are exactly as claimed: setMemberRole (L84) `membership.role === 'admin' && role === 'member' && countAdmins(db, householdId) <= 1` and removeMember (L104) `membership.role === 'admin' && countAdmins <= 1`. These correctly prevent dem

- ⚪ **[LOW]** `src/lib/server/db/index.ts` — Auto-seed in module top-level can run against an unmigrated/partially-migrated DB and crashes app boot on any DB error
  - Verifier A(mechanism): **REAL** (high) — Read /home/sbrn/Projects/garde-manger/src/lib/server/db/index.ts (L8-15), seed/seed.ts, and db/client.ts.

CLAIM #1 (import-time crash) — VERIFIED. index.ts L8-15 are module top-level side-effects: `export const { db, sqlite } = createDb(DATABASE_PATH); runMigrations(db);` then `

- Verifier B(impact): **refuted** (high) — I read src/lib/server/db/index.ts (L8-15), src/lib/server/seed/seed.ts, and src/lib/server/db/client.ts.

The mechanism described in sub-claim 1 (top-level import side-effects) is literally present: index.ts L8-15 runs createDb, runMigrations(db), a synchronous foods select, and

- ⚪ **[LOW]** `src/lib/dates.ts` — dayBadge produces "NaN" label for unparseable ISO input
  - Verifier A(mechanism): **REAL** (high) — Verified the mechanism in src/lib/dates.ts L4-11. For a malformed (non-null) iso, `new Date(iso)` (L6) yields an Invalid Date; `d.getUTCFullYear/Month/Date()` (L8) return NaN; `Date.UTC(NaN,NaN,NaN)` = NaN; `Math.round((NaN - today)/MS_PER_DAY)` (L9) = NaN; so the function return
  - Verifier B(impact): **refuted** (high) — The mechanism is genuine: in src/lib/dates.ts:6-10, new Date(iso) on a malformed string yields Invalid Date, getUTC\* return NaN, Date.UTC(NaN,...) is NaN, Math.round(NaN) is NaN, returning {label:'NaN', days:NaN}. In DayBadge.svelte:13-19 the guards are `info.days === null` then

- ⚪ **[LOW]** `src/lib/server/auth/session.ts` — Sessions never have their expiry refreshed (no sliding window) — fixed but unused TTL semantics may surprise; verify intent
  - Verifier A(mechanism): **REAL** (high) — Mechanism verified by reading the actual code. session.ts:19 createSession sets expiresAt = now + SESSION_TTL_MS (30 days). validateSessionToken (session.ts:25-43) only reads row.expiresAt and, on expiry, deletes the row (lines 33-36); it never updates expiresAt — no sliding-wind
  - Verifier B(impact): **refuted** (high) — The mechanism described is accurate. session.ts L19 sets expiresAt = now + 30 days in createSession; validateSessionToken (L33-36) only checks `row.expiresAt.getTime() < Date.now()` and deletes on expiry, never extending expiresAt. hooks.server.ts (L8-33) validates on each reques
