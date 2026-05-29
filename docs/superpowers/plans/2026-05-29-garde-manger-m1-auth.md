# Garde-Manger — M1 Auth & Households Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Sign-in (email+password **and** passkeys) + multi-household membership: a user can sign up, log in by password or passkey, create households, invite members by link, and join — with every household-scoped query authorized.

**Architecture:** Extends M0's DB seam with new migrations. Server-only `$lib/server/auth/*` (password, session, webauthn) and `$lib/server/households.ts`. Sessions use the `id.secret` cookie model with secrets stored only as SHA-256 hashes. Auth resolved once in `hooks.server.ts` → `event.locals`. Password pages are zero-JS form actions; the passkey button is a small progressive-enhancement island. **Crypto via built-ins** — `Bun.password` (argon2id) and `node:crypto` (random/hash/timing-safe) — no `@oslojs/*` deps (frugality). `@simplewebauthn/{server,browser}` for passkeys.

**Tech Stack:** SvelteKit 2 + Svelte 5, Bun, Drizzle/`bun:sqlite`, `Bun.password`, `node:crypto`, `@simplewebauthn/server` + `@simplewebauthn/browser`, valibot.

---

## Milestone context
M1 of 6 (see `docs/superpowers/specs/2026-05-28-garde-manger-design.md` and the roadmap memory). Builds directly on M0 (`users` table exists: id, email unique, display_name, locale, created_at). M2 (inventory) will scope everything to households created here.

## File structure (created/modified in M1)
```
src/
├── hooks.server.ts                       # NEW — validate session cookie → locals.{user,session}
├── app.d.ts                              # App.Locals { user, session }
├── lib/server/
│   ├── auth/
│   │   ├── password.ts (+ .test.ts)      # Bun.password hash/verify
│   │   ├── session.ts  (+ .test.ts)      # id.secret create/validate/invalidate
│   │   ├── cookies.ts                    # set/clear session cookie helper
│   │   └── webauthn.ts (+ .test.ts)      # SimpleWebAuthn register/authenticate
│   ├── households.ts   (+ .test.ts)      # create, requireMembership, listForUser
│   ├── invitations.ts  (+ .test.ts)      # create (hashed token), accept
│   └── db/schema.ts                      # + password_hash, sessions, households, memberships, invitations, credentials
├── lib/validation.ts                     # valibot schemas (signup/login/household/invite)
└── routes/
    ├── +layout.server.ts                 # expose locals.user + user's households to UI
    ├── (auth)/                           # unauthenticated area (csr=false)
    │   ├── signup/+page.svelte +page.server.ts
    │   └── login/+page.svelte +page.server.ts (+ passkey island)
    ├── logout/+server.ts
    ├── (app)/                            # authenticated area; +layout.server.ts guards
    │   ├── +layout.server.ts             # redirect to /login if no user
    │   ├── account/+page.svelte +page.server.ts   # display name/locale + passkey mgmt (island)
    │   └── households/ ... create / switch / [id]/members / [id]/invite
    └── join/[token]/+page.svelte +page.server.ts  # accept invite
    └── api/webauthn/ (+server.ts endpoints for options/verify, used by the islands)
```
> **Testability rule (unchanged):** `$lib/server/auth/*` and `households.ts`/`invitations.ts` modules take a `db: DB` argument and import NO `$app/*`/`$env/*`, so `bun test` can exercise them with a temp DB. Routes/hooks read env + the `db` singleton and call these.

---

### Task 1: Schema + migration for auth & households

**Files:** `src/lib/server/db/schema.ts` (extend), `drizzle/0001_*` (generated), `src/lib/server/db/schema.test.ts` (new).

- [ ] **Step 1:** Extend `schema.ts` (keep existing `users`, add `passwordHash` column + new tables):
```ts
import { sqliteTable, text, integer, blob, unique } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	locale: text('locale', { enum: ['fr', 'en'] }).notNull().default('fr'),
	passwordHash: text('password_hash'), // nullable: passkey-only users are possible later
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	secretHash: blob('secret_hash', { mode: 'buffer' }).notNull(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const households = sqliteTable('households', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	warnDays: integer('warn_days').notNull().default(3),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const memberships = sqliteTable('memberships', {
	id: text('id').primaryKey(),
	householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['admin', 'member'] }).notNull(),
	joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull()
}, (t) => [unique().on(t.householdId, t.userId)]);

export const invitations = sqliteTable('invitations', {
	id: text('id').primaryKey(),
	householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
	tokenHash: blob('token_hash', { mode: 'buffer' }).notNull(),
	role: text('role', { enum: ['admin', 'member'] }).notNull(),
	createdBy: text('created_by').notNull().references(() => users.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	usedAt: integer('used_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const credentials = sqliteTable('credentials', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	credentialId: text('credential_id').notNull().unique(), // base64url
	publicKey: blob('public_key', { mode: 'buffer' }).notNull(),
	counter: integer('counter').notNull().default(0),
	transports: text('transports'), // JSON array string
	backedUp: integer('backed_up', { mode: 'boolean' }).notNull().default(false),
	deviceLabel: text('device_label'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
});
```
- [ ] **Step 2:** `bun run db:generate` → commit `drizzle/0001_*.sql` + updated journal/snapshot.
- [ ] **Step 3 (TDD):** `schema.test.ts` — using a temp DB + `runMigrations`: insert a user, a session (FK), a household + membership (assert the `unique(household_id,user_id)` rejects a duplicate via expect-throw), and a credential; round-trip-select one. Assert FK enforcement (inserting a membership with a bogus `household_id` throws).
- [ ] **Step 4:** `bun test` (all) green; `bun run check` clean. **Commit:** `feat(db): auth & household tables (migration 0001)`.

---

### Task 2: Password hashing module (TDD)

**Files:** `src/lib/server/auth/password.ts` (+ `.test.ts`).

- [ ] **Step 1 (red):** test that `hashPassword('pw')` returns a string ≠ the input and `verifyPassword('pw', hash)` is `true`, `verifyPassword('wrong', hash)` is `false`. (Both async.)
- [ ] **Step 2 (green):** implement with Bun built-in (argon2id default):
```ts
export function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password); // argon2id by default
}
export function verifyPassword(password: string, hash: string): Promise<boolean> {
	return Bun.password.verify(password, hash);
}
```
- [ ] **Step 3:** `bun test` green. **Commit:** `feat(auth): argon2id password hashing via Bun.password`.

---

### Task 3: Session module — `id.secret` (TDD, security-critical)

**Files:** `src/lib/server/auth/session.ts` (+ `.test.ts`).

Token format `"<id>.<secret>"`. Store `secret_hash = sha256(secret)`; validate by constant-time comparing the hash. Use `node:crypto` only.

- [ ] **Step 1 (red):** tests (temp DB + migrations + a seeded user):
  - `createSession(db, userId)` returns `{ token, session }`; token has exactly one `.`; a `sessions` row exists with a 32-byte `secret_hash` and `expiresAt` ~30 days ahead.
  - `validateSessionToken(db, token)` returns `{ session, user }` for the fresh token.
  - tampering the secret (swap last char) → `validateSessionToken` returns `null`.
  - a malformed token (no dot) → `null`.
  - an expired session (insert one with past `expiresAt`) → `null` **and** the row is deleted.
- [ ] **Step 2 (green):** implement:
```ts
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { sessions, users } from '../db/schema';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const sha256 = (s: string) => createHash('sha256').update(s).digest(); // Buffer

function randomId(bytes = 18) { return randomBytes(bytes).toString('base64url'); }

export async function createSession(db: DB, userId: string) {
	const id = randomId();
	const secret = randomId(24);
	const now = new Date();
	const session = { id, secretHash: sha256(secret), userId, createdAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) };
	await db.insert(sessions).values(session).run();
	return { token: `${id}.${secret}`, session };
}

export async function validateSessionToken(db: DB, token: string) {
	const parts = token.split('.');
	if (parts.length !== 2) return null;
	const [id, secret] = parts;
	const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
	if (!row) return null;
	if (row.expiresAt.getTime() < Date.now()) { db.delete(sessions).where(eq(sessions.id, id)).run(); return null; }
	const expected = row.secretHash as Buffer;
	const actual = sha256(secret);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
	const user = db.select().from(users).where(eq(users.id, row.userId)).get();
	if (!user) return null;
	return { session: row, user };
}

export function invalidateSession(db: DB, sessionId: string) {
	db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}
```
- [ ] **Step 3:** `bun test` green; `bun run check` clean. **Commit:** `feat(auth): id.secret session tokens with hashed secrets`.

---

### Task 4: `hooks.server.ts` + cookie helper + Locals types

**Files:** `src/hooks.server.ts`, `src/lib/server/auth/cookies.ts`, `src/app.d.ts`.

- [ ] **Step 1:** `cookies.ts` — `SESSION_COOKIE='gm_session'`, `setSessionCookie(cookies, token, expiresAt)` (`HttpOnly; Secure; SameSite=Lax; Path=/`), `clearSessionCookie(cookies)`.
- [ ] **Step 2:** `app.d.ts` — `interface Locals { user: { id; email; displayName; locale } | null; session: ... | null }`.
- [ ] **Step 3:** `hooks.server.ts` — read the cookie; if present, `validateSessionToken(db, token)`; set `event.locals.user/session` (or null); if invalid, clear the cookie. Then `resolve(event)`.
- [ ] **Step 4:** `bun run check` clean; build + boot smoke (no route depends yet, just ensure it compiles & serves `/healthz`). **Commit:** `feat(auth): resolve session in hooks → event.locals`.

---

### Task 5: Signup (`/signup`, zero-JS form action)

**Files:** `src/routes/(auth)/signup/+page.svelte` + `+page.server.ts`, `src/lib/validation.ts`.
- `(auth)` group `+layout` sets `export const ssr=true; export const csr=false;`.
- [ ] **Step 1:** valibot `signupSchema` (email, displayName, password min 8, locale).
- [ ] **Step 2:** `+page.server.ts` action: validate; lowercase email; reject if email exists (`fail(400)`); `hashPassword`; insert user (id via `crypto.randomUUID()`); `createSession` + `setSessionCookie`; `redirect(303,'/')`. If already logged in (`locals.user`), redirect to `/`.
- [ ] **Step 3:** `+page.svelte` — accessible FR-first form (email/displayName/password), shows `form?.message` errors. No `use:enhance` (zero-JS).
- [ ] **Step 4:** e2e smoke: build+boot, POST signup via curl → 303 + `Set-Cookie: gm_session`; `bun run check` clean. **Commit:** `feat(auth): email+password signup`.

---

### Task 6: Login + logout

**Files:** `src/routes/(auth)/login/+page.svelte` + `+page.server.ts`, `src/routes/logout/+server.ts`.
- [ ] **Step 1:** login action: validate; find user by email; if none or `!passwordHash` → generic `fail(400,'Identifiants invalides')`; `verifyPassword`; on success `createSession` + cookie + redirect. **Generic error message** (don't reveal which field). 
- [ ] **Step 2:** `/logout` POST: `invalidateSession(locals.session.id)`, `clearSessionCookie`, redirect to `/login`.
- [ ] **Step 3:** login page form (+ a placeholder spot for the passkey button island, wired in Task 11).
- [ ] **Step 4:** e2e: signup→logout→login round-trip via curl (cookie jar) returns authenticated; `bun run check`. **Commit:** `feat(auth): password login + logout`.

---

### Task 7: Households module (TDD)

**Files:** `src/lib/server/households.ts` (+ `.test.ts`).
- [ ] **Step 1 (red):** tests (temp DB) for:
  - `createHousehold(db, { name, ownerId })` → creates household + an **admin** membership for owner; returns household.
  - `listForUser(db, userId)` → households the user belongs to (with role).
  - `requireMembership(db, householdId, userId, role?)` → returns the membership; **throws** (typed error) if not a member, or if `role==='admin'` required but the user is only `member`.
- [ ] **Step 2 (green):** implement with `crypto.randomUUID()` ids; one transaction for create+membership. A `MembershipError` class for authz failures.
- [ ] **Step 3:** `bun test` green. **Commit:** `feat(households): create + membership/role checks`.

---

### Task 8: Household routes (create / list / switch / members)

**Files:** `src/routes/(app)/+layout.server.ts` (guard), `src/routes/(app)/households/**`, `src/routes/(app)/+layout.svelte` (household switcher), `+layout.server.ts` (root, expose households).
- [ ] **Step 1:** `(app)/+layout.server.ts` — if `!locals.user` → `redirect(303,'/login')`. Load `listForUser`. Active household via a `gm_household` cookie (default first); expose `{ user, households, activeHouseholdId }`.
- [ ] **Step 2:** create-household form action (any logged-in user); list page; switch = set `gm_household` cookie (form action) ; members page lists memberships (must be a member; verified via `requireMembership`).
- [ ] **Step 3:** `(app)/+layout.svelte` — household switcher in the top bar (zero-JS `<form>` GET/POST), link to account/logout.
- [ ] **Step 4:** e2e: signup → create household → appears in switcher; `bun run check`. **Commit:** `feat(households): create/list/switch/members routes`.

---

### Task 9: Invitations — create + accept (TDD + routes)

**Files:** `src/lib/server/invitations.ts` (+ `.test.ts`), `src/routes/(app)/households/[id]/invite/**`, `src/routes/join/[token]/**`.
- [ ] **Step 1 (red):** tests:
  - `createInvitation(db, { householdId, role, createdBy })` → returns `{ token, invitation }`; stores only `sha256(token)`; `expiresAt` ~7 days; token is URL-safe.
  - `acceptInvitation(db, { token, userId })` → validates (exists by hash, not expired, not used), adds membership with the invite's role, marks `usedAt`; returns the household. Re-accepting the same token → throws (used). Wrong/expired token → throws.
  - accepting when already a member → no duplicate (idempotent or typed error — pick: **return existing membership**, mark used).
- [ ] **Step 2 (green):** implement (hash with the same `sha256` helper; `crypto.randomUUID()`/`randomBytes` token).
- [ ] **Step 3:** invite route — **admin-only** (`requireMembership(...,'admin')`) form action that creates an invite and shows the shareable link + a QR (QR via a tiny inline SVG generator or the `qrcode` lib — prefer a minimal dep or server-rendered SVG). `/join/[token]` — if logged in, accept + redirect to the household; if not, store token and route through login/signup then accept.
- [ ] **Step 4:** e2e: admin creates invite → second user (signup) opens `/join/[token]` → becomes a member; `bun run check`. **Commit:** `feat(invitations): shareable single-use invite links`.

---

### Task 10: Passkey registration (TDD + enroll island)

**Files:** `src/lib/server/auth/webauthn.ts` (+ `.test.ts`), `src/routes/api/webauthn/register/+server.ts` (options + verify), `src/lib/components/PasskeyEnroll.svelte` (island), account page wiring. Deps: `bun add @simplewebauthn/server @simplewebauthn/browser`.

> **Version note:** verify the installed `@simplewebauthn/server` API shape (v10+ uses `registrationInfo.credential.{id,publicKey,counter,transports}` and `verifyRegistrationResponse`/`generateRegistrationOptions`). Adjust field access to the installed version; consult its README/types.

- [ ] **Step 1:** `webauthn.ts` config from env (`RP_ID`, `RP_NAME`, `ORIGIN`, with dev defaults `localhost` / `http://localhost:5173`). Functions: `registrationOptions(db, user)` (sets `excludeCredentials` from the user's existing creds, `residentKey:'preferred'`, `userVerification:'preferred'`) returning options + the `challenge`; `verifyRegistration(db, { user, response, expectedChallenge })` → on `verified`, persist a `credentials` row (credentialId base64url, publicKey buffer, counter, transports JSON, backedUp). 
- [ ] **Step 2 (TDD where practical):** unit-test the storage/towards-DB helper and option-building (challenge present, excludeCredentials reflects existing creds). Full ceremony verification is integration-tested with a mocked `@simplewebauthn/server` verify (assert a verified response writes a credential with the right fields; an unverified response writes nothing).
- [ ] **Step 3:** register endpoint: GET/POST `options` (stores challenge in a short-lived `HttpOnly` cookie), POST `verify`. `PasskeyEnroll.svelte` island uses `@simplewebauthn/browser` `startRegistration`; only rendered when `locals.user` and shown on the account page; lazy/`csr` island.
- [ ] **Step 4:** `bun test` + `bun run check`. **Commit:** `feat(auth): passkey registration (WebAuthn)`.

---

### Task 11: Passkey authentication (TDD + login island) + account passkey mgmt

**Files:** `webauthn.ts` (extend), `src/routes/api/webauthn/authenticate/+server.ts`, `src/lib/components/PasskeyLogin.svelte`, account page (list/remove passkeys).
- [ ] **Step 1:** `authenticationOptions(db)` (usernameless: empty `allowCredentials`, store challenge cookie); `verifyAuthentication(db, { response, expectedChallenge })` → look up credential by `credentialId`, verify against stored `publicKey`+`counter`, handle synced-passkey `counter===0` (don't fail when both stored and returned are 0), update `counter`+`lastUsedAt`, return the `userId`. On success the endpoint creates a session + cookie.
- [ ] **Step 2 (TDD):** integration test with mocked verify: a verified assertion for a stored credential updates the counter and yields the user; an unknown credentialId → reject; a counter regression (returned < stored, both non-zero) → reject.
- [ ] **Step 3:** `PasskeyLogin.svelte` island on `/login` ("Se connecter avec une passkey", shown only if `navigator.credentials` + `PublicKeyCredential` exist) → `startAuthentication` → POST verify → on success redirect. Account page lists the user's passkeys (deviceLabel, createdAt, lastUsedAt) with a remove form action (admin of own creds).
- [ ] **Step 4:** `bun test` + `bun run check`; build+boot smoke of `/login` and `/account`. **Commit:** `feat(auth): passkey sign-in + management`.

---

### Task 12: Wire-up, gate, and milestone acceptance

**Files:** root `+layout.server.ts`/`+layout.svelte` (top bar shows user + active household + logout), redirect home `/` into `(app)`, `.env.example` (+ `RP_ID`, `RP_NAME`, `ORIGIN`), README env section update.
- [ ] **Step 1:** `/` (root) → if logged in show the `(app)` shell home (placeholder "inventaire à venir — M2"), else redirect to `/login`. Ensure unauthenticated access to any `(app)` route redirects to `/login`.
- [ ] **Step 2:** `.env.example` adds `RP_ID=localhost`, `RP_NAME=Garde-Manger`, `ORIGIN=http://localhost:5173`; README documents them + that prod needs a stable HTTPS domain for passkeys.
- [ ] **Step 3:** Full `bun test`, `bun run lint`, `bun run check`, and an e2e script: signup → create household → invite → second user joins → logout → password login → (manual note: passkey requires a real authenticator, so covered by unit/integration tests, not curl).
- [ ] **Step 4:** **Commit:** `feat: M1 wire-up — auth gate, active household, env/docs`.

---

## Done-when (M1 acceptance)
- All `bun test` pass; `lint`/`check` clean; build under Bun succeeds.
- A new user can **sign up**, **log out**, **log in by password**; sessions persist via the `gm_session` cookie and are invalidated on logout.
- **Passkeys**: a logged-in user can enroll a passkey; the ceremonies + storage are covered by tests (live authenticator flows verified manually later).
- A user can **create a household** (becomes admin), **switch** active household, **invite** by link (admin-only), and a second user can **join**; non-members are rejected by `requireMembership`.
- No secrets/tokens stored in plaintext (passwords argon2id; session secrets + invite tokens stored as SHA-256 hashes).

**Next:** M2 — Inventory + catalogue (European shelf-life seed, urgency-first home, add-fresh DDM, consumed/discarded, FR/EN i18n), scoped to these households.
