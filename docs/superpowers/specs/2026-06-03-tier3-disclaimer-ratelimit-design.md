# Tier 3 — Food-safety disclaimer in-app + login rate limiting

Date: 2026-06-03
Status: Approved (autonomous run)

## Context

Two hardening items the council flagged as "fix before expanding":

1. **Food-safety disclaimer.** `README.md` warns that shelf-life figures are draft
   estimates "not reviewed by a food-safety professional", but that caveat never
   reaches the user at the point where an estimated date is shown/acted on. Surface
   a concise disclaimer wherever an estimate appears.
2. **Login rate limiting.** `src/routes/(auth)/login/+page.server.ts` has no
   throttling — an internet-exposed self-hosted instance can be password-brute-forced.
   The codebase already has a sliding-window limiter pattern (`offRateLimit.ts`);
   reuse it for auth.

No schema change. New i18n keys in both locales + the hand-written `Messages` interface.

## Non-goals
- Rate-limiting signup / WebAuthn endpoints (login password brute-force is the
  concrete threat; keep scope tight).
- A persistent dismissible banner or an About page (a concise inline note suffices).
- Catalogue data review itself (separate, ongoing).

## Design

### A. Food-safety disclaimer

New i18n key `est_disclaimer` (string, both locales + `Messages`):
- EN: "Estimated date — not a food-safety guarantee. When in doubt, trust your senses."
- FR: "Date estimée — ne garantit pas la sécurité alimentaire. Au moindre doute, fiez-vous à vos sens."

Surfaces:
- **`src/routes/(app)/item/[id]/+page.svelte`** — in the `{#if it.isEstimate}` block
  (currently `<small class="est-note">~ {t.est_label}</small>`), add the disclaimer
  as a second muted line (e.g. a `<small class="est-disclaimer">{t.est_disclaimer}</small>`).
- **`src/routes/(app)/add/+page.svelte`** — in the `.estimate-box` (after the
  existing `<p class="estimate-note">{t.add_estimate_note}</p>` at ~line 66), add the
  disclaimer in the same muted style.

Both are read-only display additions; no logic.

### B. Login rate limiting

**New `src/lib/server/auth/rateLimit.ts`** — a per-key sliding-window FAILED-attempt
limiter, mirroring `offRateLimit.ts` style (pure factory, unit-testable):

```ts
export function createAttemptLimiter(opts: { maxAttempts: number; windowMs: number }) {
	const byKey = new Map<string, number[]>();
	const prune = (arr: number[], t: number) => {
		while (arr.length > 0 && arr[0] <= t - opts.windowMs) arr.shift();
		return arr;
	};
	return {
		isLimited(key: string, now: Date): boolean {
			const arr = prune(byKey.get(key) ?? [], now.getTime());
			byKey.set(key, arr);
			return arr.length >= opts.maxAttempts;
		},
		record(key: string, now: Date): void {
			const arr = prune(byKey.get(key) ?? [], now.getTime());
			arr.push(now.getTime());
			byKey.set(key, arr);
		},
		reset(key: string): void {
			byKey.delete(key);
		}
	};
}

/** Login: 10 failed attempts per rolling 10 min, keyed by normalized email. */
export const loginAttemptLimiter = createAttemptLimiter({ maxAttempts: 10, windowMs: 600_000 });
```

**Keying decision:** key by **normalized (lowercased) email**, not IP. Rationale:
behind Coolify/Traefik `getClientAddress()` can collapse all users to the proxy IP
(unless `ADDRESS_HEADER` is set), which would over-block. Email-keying directly
defends the realistic "brute-force one known account" threat and never blocks a
different user. Counting only **failed** attempts and `reset()`-ing on success keeps
the small self-healing DoS window (≤10 min) from affecting a legitimate user who
eventually logs in. Memory is bounded by distinct emails attempted per window
(single-instance deployment — same assumption as `offRateLimit`).

**`login/+page.server.ts`** changes in the `default` action:
- After parsing a valid email, compute `key = email` (already lowercased).
- `if (loginAttemptLimiter.isLimited(key, new Date())) return fail(429, { message: t.auth_rate_limited });`
  — placed BEFORE the user lookup so a limited key can't probe.
- On any auth failure (user-not-found / no passwordHash / bad password):
  `loginAttemptLimiter.record(key, new Date());` then `return fail(400, …)` as today.
- On success (after `createSession`): `loginAttemptLimiter.reset(key);`.

New i18n key `auth_rate_limited` (both locales + `Messages`):
- EN: "Too many attempts. Please wait a few minutes and try again."
- FR: "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer."

## Files touched
- `src/lib/server/auth/rateLimit.ts` (new) + `rateLimit.test.ts` (new)
- `src/routes/(auth)/login/+page.server.ts`
- `src/lib/i18n/messages/fr.ts` + `en.ts` (+ `Messages`): `est_disclaimer`, `auth_rate_limited`
- `src/routes/(app)/item/[id]/+page.svelte`, `src/routes/(app)/add/+page.svelte`
- `tests/e2e/auth.spec.ts` — rate-limit e2e

## Testing (TDD)
- `createAttemptLimiter`: under limit not limited; at/over `maxAttempts` limited;
  window expiry drops old attempts; `reset` clears; keys are independent.
- e2e: N+1 failed logins for a unique email surface `auth_rate_limited`; a correct
  login for a *different* email is unaffected. Use a dedicated email so the
  module-level limiter state doesn't bleed into other auth tests.
- Disclaimer: covered by an e2e assertion that the estimate disclaimer text shows
  on an estimated item's detail page (extend an existing item/estimate e2e or add one).
