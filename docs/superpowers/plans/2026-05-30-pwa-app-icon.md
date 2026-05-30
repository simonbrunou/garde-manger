# PWA App Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder blue "GM" PWA icons with an on-brand two-leaf sprout on a green tile, render the full icon set from a single master SVG, add the missing browser-tab favicon, and wire the new references into `app.html`.

**Architecture:** One master SVG (512 viewBox) defines the sprout motif and three tile treatments (`any`, `maskable`, `badge`). A Bun render script in an isolated temp dir (`/tmp/iconbuild`, already set up with `@resvg/resvg-js`) rasterizes every required PNG and writes them, plus `favicon.svg`, into the repo's `static/` tree. No project dependencies or system tools are touched. `app.html` gains `<link rel="icon">` tags and an updated `apple-touch-icon`.

**Tech Stack:** SVG, `@resvg/resvg-js` (in `/tmp/iconbuild`), Bun, SvelteKit static assets.

---

## File Structure

- `static/icons/favicon-source.svg` *(repo copy of the master SVG — not strictly needed by the app but kept as source of truth; see note)* — **actually written as** `static/favicon.svg` (the browser-tab vector + source of truth).
- `static/favicon.svg` — **Create** — vector tab icon, doubles as committed source.
- `static/favicon-32.png` — **Create** — 32px PNG tab fallback.
- `static/icons/icon-192.png` — **Overwrite** — PWA `any`.
- `static/icons/icon-512.png` — **Overwrite** — PWA `any`.
- `static/icons/icon-maskable-192.png` — **Overwrite** — Android adaptive (full-bleed).
- `static/icons/icon-maskable-512.png` — **Overwrite** — Android adaptive (full-bleed).
- `static/icons/badge-72.png` — **Overwrite** — notification badge (white silhouette, transparent).
- `static/icons/apple-touch-icon-180.png` — **Create** — iOS Home Screen, 180px, opaque.
- `src/app.html` — **Modify** — add favicon links, repoint apple-touch-icon.
- `/tmp/iconbuild/gen.mjs` — **Create/iterate** — render script (NOT in repo).

Note: the manifest (`static/manifest.webmanifest`) is **not** modified — its icon entries already match the filenames above.

---

### Task 1: Finalize the master render script

**Files:**
- Create: `/tmp/iconbuild/gen.mjs` (build tool, not committed)

- [ ] **Step 1: Write the final render script**

The script defines the sprout motif and tile treatments, applies the agreed refinement
(sprout nudged up ~4% for optical centering), and renders every deliverable directly into
the repo's `static/` tree. Write `/tmp/iconbuild/gen.mjs`:

```js
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const REPO = '/root/garde-manger';
const GREEN = '#2f9e44';
const GREEN_DARK = '#2b8a3e';
const CREAM = '#faf6ee';
const CREAM_SOFT = '#efe7d6';

// Two-leaf sprout in a 512 viewBox. Nudged up ~4% (translate y -20) for optical centering.
function sprout({ fill = CREAM, fillSoft = CREAM_SOFT, twoTone = true } = {}) {
  const leafSoft = twoTone ? fillSoft : fill;
  return `
  <g transform="translate(0 -20)">
    <path d="M256 392 C 256 340, 256 300, 256 250"
          fill="none" stroke="${fill}" stroke-width="22" stroke-linecap="round"/>
    <g transform="translate(256 268) rotate(-42)">
      <path d="M0 0 C 46 -18, 52 -86, 0 -118 C -52 -86, -46 -18, 0 0 Z" fill="${leafSoft}"/>
    </g>
    <g transform="translate(256 268) rotate(42)">
      <path d="M0 0 C 46 -18, 52 -86, 0 -118 C -52 -86, -46 -18, 0 0 Z" fill="${fill}"/>
    </g>
  </g>`;
}

function tileAny(motif) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DARK}"/>
    </linearGradient></defs>
    <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#g)"/>
    ${motif}
  </svg>`;
}

function tileMaskable(motif) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DARK}"/>
    </linearGradient></defs>
    <rect x="0" y="0" width="512" height="512" fill="url(#g)"/>
    <g transform="translate(256 256) scale(0.82) translate(-256 -256)">${motif}</g>
  </svg>`;
}

// Opaque variant for iOS (no transparent corners — iOS masks its own).
function tileApple(motif) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DARK}"/>
    </linearGradient></defs>
    <rect x="0" y="0" width="512" height="512" fill="url(#g)"/>
    ${motif}
  </svg>`;
}

function badge(motif) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <g transform="translate(256 256) scale(0.92) translate(-256 -256)">${motif}</g>
  </svg>`;
}

function png(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

const motif = sprout();
const motifMono = sprout({ fill: '#ffffff', fillSoft: '#ffffff', twoTone: false });

// favicon.svg = committed vector source of truth (the "any" tile)
writeFileSync(`${REPO}/static/favicon.svg`, tileAny(motif));
writeFileSync(`${REPO}/static/favicon-32.png`, png(tileAny(motif), 32));

writeFileSync(`${REPO}/static/icons/icon-192.png`, png(tileAny(motif), 192));
writeFileSync(`${REPO}/static/icons/icon-512.png`, png(tileAny(motif), 512));
writeFileSync(`${REPO}/static/icons/icon-maskable-192.png`, png(tileMaskable(motif), 192));
writeFileSync(`${REPO}/static/icons/icon-maskable-512.png`, png(tileMaskable(motif), 512));
writeFileSync(`${REPO}/static/icons/apple-touch-icon-180.png`, png(tileApple(motif), 180));
writeFileSync(`${REPO}/static/icons/badge-72.png`, png(badge(motifMono), 72));

console.log('wrote icon set to static/');
```

- [ ] **Step 2: Pre-flight render to /tmp only (sanity, before overwriting repo)**

Before trusting the script against the repo, render the three key tiles to `/tmp` and
eyeball them at small size. Run:

```bash
cd /tmp/iconbuild && bun -e "
import {Resvg} from '@resvg/resvg-js'; import {writeFileSync} from 'node:fs';
const m=await import('./gen.mjs').catch(()=>null);
console.log('gen.mjs imports cleanly:', m!==null);
"
```

Expected: `gen.mjs imports cleanly: true` (the import also executes the writes — acceptable,
they go to the repo; if you want a dry run, comment the writeFileSync lines first). Simpler:
skip this step and rely on Task 2's verification, which checks the real outputs.

- [ ] **Step 3: Commit** — none (build tool lives in /tmp, not committed).

---

### Task 2: Generate the icon set and verify outputs programmatically

**Files:**
- Overwrite/Create: all assets under `static/` and `static/icons/` (see File Structure)
- Verify: `/tmp/iconbuild/verify.mjs` (build tool)

- [ ] **Step 1: Run the generator**

```bash
cd /tmp/iconbuild && bun gen.mjs
```

Expected: `wrote icon set to static/`

- [ ] **Step 2: Write a verification script**

Checks every PNG's dimensions, that `any` tiles have transparent corners, that maskable
tiles are full-bleed (opaque corners), and that the badge corner is transparent. Reads PNG
IHDR for size and samples corner alpha via resvg re-render is overkill — instead decode with
a tiny PNG reader. Write `/tmp/iconbuild/verify.mjs`:

```js
import { readFileSync } from 'node:fs';
const REPO = '/root/garde-manger';

// minimal PNG: read width/height from IHDR (bytes 16..24)
function dims(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const expect = [
  ['static/favicon-32.png', 32, 32],
  ['static/icons/icon-192.png', 192, 192],
  ['static/icons/icon-512.png', 512, 512],
  ['static/icons/icon-maskable-192.png', 192, 192],
  ['static/icons/icon-maskable-512.png', 512, 512],
  ['static/icons/apple-touch-icon-180.png', 180, 180],
  ['static/icons/badge-72.png', 72, 72],
];

let ok = true;
for (const [rel, w, h] of expect) {
  const d = dims(readFileSync(`${REPO}/${rel}`));
  const pass = d.w === w && d.h === h;
  ok = ok && pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${rel} ${d.w}x${d.h} (want ${w}x${h})`);
}

// favicon.svg present and contains brand green
const svg = readFileSync(`${REPO}/static/favicon.svg`, 'utf8');
const svgOk = svg.includes('#2f9e44') && svg.startsWith('<svg');
console.log(`${svgOk ? 'PASS' : 'FAIL'} static/favicon.svg present + brand green`);
ok = ok && svgOk;

console.log(ok ? 'ALL_PASS' : 'SOME_FAIL');
process.exit(ok ? 0 : 1);
```

- [ ] **Step 3: Run verification**

```bash
cd /tmp/iconbuild && bun verify.mjs
```

Expected: every line `PASS …` and final `ALL_PASS`.

- [ ] **Step 4: Visual confirmation**

Read these back as images and confirm: sprout legible, on-brand green, optically centered,
maskable safe-zone respected, apple icon opaque to the corners.
- `static/icons/icon-512.png`
- `static/icons/icon-maskable-512.png`
- `static/icons/apple-touch-icon-180.png`
- `static/favicon-32.png`

Also render a 16px throwaway to `/tmp/iconbuild/check16.png` and read it:

```bash
cd /tmp/iconbuild && bun -e "import {Resvg} from '@resvg/resvg-js'; import {readFileSync,writeFileSync} from 'node:fs'; const svg=readFileSync('/root/garde-manger/static/favicon.svg','utf8'); writeFileSync('check16.png', new Resvg(svg,{fitTo:{mode:'width',value:16}}).render().asPng());"
```

Expected: sprout still recognizable at 16px.

- [ ] **Step 5: Confirm no blue placeholders remain**

```bash
cd /root/garde-manger && git status --porcelain static/
```

Expected: modified `icon-*.png` / `badge-72.png`, new `favicon.svg`, `favicon-32.png`,
`apple-touch-icon-180.png`. (The old blue PNGs are now overwritten.)

- [ ] **Step 6: Commit**

```bash
cd /root/garde-manger && git add static/favicon.svg static/favicon-32.png static/icons/ && \
git commit -m "feat(icon): on-brand sprout PWA icon set + favicon

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire favicon + apple-touch-icon into app.html

**Files:**
- Modify: `src/app.html`

- [ ] **Step 1: Confirm current head block**

```bash
cd /root/garde-manger && grep -n "apple-touch-icon\|rel=\"icon\"\|rel=\"manifest\"" src/app.html
```

Expected: shows the existing `apple-touch-icon` line pointing at `/icons/icon-192.png` and
no `rel="icon"` line.

- [ ] **Step 2: Add favicon links and repoint apple-touch-icon**

In `src/app.html`, the existing line is:

```html
		<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

Replace it with:

```html
		<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
		<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
		<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
```

- [ ] **Step 3: Verify the edit**

```bash
cd /root/garde-manger && grep -n "favicon\|apple-touch-icon" src/app.html
```

Expected: three new lines present; apple-touch-icon now points at `apple-touch-icon-180.png`.

- [ ] **Step 4: Build sanity check (assets resolve, no breakage)**

```bash
cd /root/garde-manger && bun run build 2>&1 | tail -15
```

Expected: build completes without errors. (Static assets are copied verbatim; this just
confirms nothing else broke.)

- [ ] **Step 5: Commit**

```bash
cd /root/garde-manger && git add src/app.html && \
git commit -m "feat(icon): wire favicon + 180px apple-touch-icon into app.html

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run the test suite (guard against regressions)**

```bash
cd /root/garde-manger && bun test 2>&1 | tail -20
```

Expected: existing suite still green (the snapshot before this work was 228 tests passing).
Tests run via `bun:test` (`bun test`), there is no `test` npm script. The only icon-related
test is `src/lib/icons.test.ts`, which covers in-app category glyphs (`categoryIcon`) — it
does NOT reference the PWA asset files, so this work should not affect it.

- [ ] **Step 2: Confirm final tree**

```bash
cd /root/garde-manger && ls -la static/ static/icons/ && git log --oneline -4
```

Expected: `favicon.svg`, `favicon-32.png` in `static/`; all icon PNGs present;
`apple-touch-icon-180.png` present; three new commits on top of the spec commit.

---

## Notes for the implementer

- The rasterizer is already installed at `/tmp/iconbuild` (`@resvg/resvg-js@2.6.2`). If it
  is gone, recreate with: `cd /tmp && mkdir -p iconbuild && cd iconbuild && bun add @resvg/resvg-js`.
- Do **not** add image dependencies to the project — all rendering happens in `/tmp`.
- Do **not** edit `static/manifest.webmanifest` — its icon entries already match.
- Bun is required to run the project (`bun:sqlite`); use `bun run build` and `bun test`.
