# Garde-Manger app icon — design spec

**Date:** 2026-05-30
**Status:** Approved (design direction)

## Problem

The PWA wiring already exists (`manifest.webmanifest`, `apple-touch-icon`, maskable
entries, `apple-mobile-web-app-title`), but the icon assets in `static/icons/` are
generic blue **"GM"** placeholders. They use the wrong brand colour (royal blue instead
of the app's green) and carry no meaning. The browser tab also has **no favicon** at all.

We need a real, on-brand icon set for: the iOS Home Screen (installed PWA), the Android
Home Screen (adaptive/maskable), notification badges, and the browser tab.

## Design direction (approved)

- **Motif:** a clean, centered **two-leaf sprout** — pointed almond leaves on a short
  stem, rounded caps. Speaks to freshness, ecology, and anti-waste (the heart of the app).
  Reads from 512 px down to a 16 px favicon.
- **Tile:** rounded-rect in brand green with a subtle vertical gradient for depth.
  - Green `#2f9e44` → `#2b8a3e` (matches manifest `theme_color` / `--green`).
  - Motif in warm cream `#faf6ee` (matches `--bg` / manifest `background_color`).
  - Leaves are lightly **two-tone** (cream `#faf6ee` + soft cream `#efe7d6`) for depth.

### Refinements agreed during review
- Nudge the sprout up ~4% so it is **optically centered** (currently sits a touch low).
- Verify legibility at **16 px** as well as 32 px.

## Source of truth

A single master **SVG** (512 viewBox) defines the motif and three tile treatments
(`any`, `maskable`, `badge`). Every PNG is rendered from that SVG, so the set stays
consistent and is trivially regenerable.

- Rasterizer: `@resvg/resvg-js`, run from an **isolated temp dir** (`/tmp/iconbuild`).
  The project's own dependencies are **not** modified. No system tools (`convert`,
  `rsvg`, `sharp`) are required or installed.
- The committed `favicon.svg` doubles as the vector source kept in the repo.

## Deliverables

### Assets written to `static/`

| File | Size | Purpose | Background |
|---|---|---|---|
| `icons/icon-192.png` | 192 | PWA `any` | rounded tile, transparent corners |
| `icons/icon-512.png` | 512 | PWA `any` | rounded tile, transparent corners |
| `icons/icon-maskable-192.png` | 192 | Android adaptive | full-bleed green square |
| `icons/icon-maskable-512.png` | 512 | Android adaptive | full-bleed green square |
| `icons/badge-72.png` | 72 | notification badge | white silhouette, transparent |
| `icons/apple-touch-icon-180.png` | 180 | iOS Home Screen | rounded tile (opaque) |
| `favicon.svg` | vector | browser tab | rounded tile |
| `favicon-32.png` | 32 | browser tab fallback | rounded tile |

- **Maskable** keeps the sprout inside the ~80% center safe zone so circle/squircle
  masks never clip it.
- **Badge** is a monochrome white silhouette on transparent (Android tints it).

### `src/app.html` wiring

The manifest already lists icon entries correctly, so **no manifest change** is needed.
Add to `<head>`:

- `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`
- `<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />` (fallback)
- Update `apple-touch-icon` to point at the new 180 px asset:
  `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />`

## Out of scope

- No manifest schema changes (entries already correct).
- No splash-screen images.
- No `.ico` (modern browsers accept SVG + PNG; skip the legacy multi-res `.ico`).

## Verification

- Visually confirm each rendered size (512, 192, 180, 72, 32, 16) — sprout legible,
  colours on-brand, maskable safe-zone respected, badge silhouette correct.
- Confirm `static/icons/` no longer contains blue "GM" placeholders.
- Confirm `app.html` references resolve (paths exist under `static/`).
- The build is unaffected: `static/` is copied verbatim; no new project deps.
