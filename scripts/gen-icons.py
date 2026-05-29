#!/usr/bin/env python3
"""Generate Garde-Manger PWA icons as real PNGs without any image library.

No rasterizer (rsvg/ImageMagick/inkscape) and no PIL/canvas/sharp are available in
this environment, so we hand-roll a minimal truecolor+alpha PNG encoder (zlib for
the IDAT, manual CRC32). We paint a flat theme-blue (#2563eb) rounded square and a
white "GM" glyph drawn from rectangle strokes. The maskable icon keeps the glyph in
the inner 80% safe zone. The badge is a small monochrome (white-on-transparent) "GM".

Output: static/icons/{icon-192,icon-512,icon-maskable-512,badge-72}.png
"""

import struct
import zlib
import os

BLUE = (0x25, 0x63, 0xEB)
WHITE = (0xFF, 0xFF, 0xFF)


def write_png(path, width, height, pixels):
    """pixels: list of rows; each row a list of (r,g,b,a) tuples."""

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type 0 (None) per scanline
        for (r, g, b, a) in row:
            raw += bytes((r, g, b, a))

    out = b"\x89PNG\r\n\x1a\n"
    # IHDR: 8-bit, color type 6 (truecolor + alpha)
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    out += chunk(b"IEND", b"")

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(out)


def blank(width, height, color=(0, 0, 0, 0)):
    return [[color for _ in range(width)] for _ in range(height)]


def fill_rect(px, x0, y0, x1, y1, color):
    h = len(px)
    w = len(px[0]) if h else 0
    for y in range(max(0, y0), min(h, y1)):
        row = px[y]
        for x in range(max(0, x0), min(w, x1)):
            row[x] = color


def rounded_bg(px, color, radius):
    """Fill the whole canvas with `color`, leaving rounded transparent corners."""
    h = len(px)
    w = len(px[0])
    r = radius
    for y in range(h):
        for x in range(w):
            cx = cy = None
            if x < r and y < r:
                cx, cy = r, r
            elif x >= w - r and y < r:
                cx, cy = w - r - 1, r
            elif x < r and y >= h - r:
                cx, cy = r, h - r - 1
            elif x >= w - r and y >= h - r:
                cx, cy = w - r - 1, h - r - 1
            if cx is not None:
                if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
                    continue
            px[y][x] = color


def draw_letter(px, letter, ox, oy, cw, ch, stroke, color):
    """Draw 'G' or 'M' inside the box (ox,oy)..(ox+cw,oy+ch) using strokes."""
    s = stroke
    if letter == "G":
        # outer C-shape
        fill_rect(px, ox, oy, ox + cw, oy + s, color)             # top
        fill_rect(px, ox, oy, ox + s, oy + ch, color)             # left
        fill_rect(px, ox, oy + ch - s, ox + cw, oy + ch, color)   # bottom
        fill_rect(px, ox + cw - s, oy + ch // 2, ox + cw, oy + ch, color)  # lower right
        fill_rect(px, ox + cw // 2, oy + ch // 2 - s, ox + cw, oy + ch // 2, color)  # inner bar
    elif letter == "M":
        fill_rect(px, ox, oy, ox + s, oy + ch, color)                       # left leg
        fill_rect(px, ox + cw - s, oy, ox + cw, oy + ch, color)             # right leg
        # two diagonals meeting in the middle
        steps = ch
        for i in range(steps):
            # left diagonal: from top-left to middle
            xl = ox + int((cw / 2 - s) * i / steps)
            for d in range(s):
                if 0 <= xl + d < ox + cw:
                    if oy + i < len(px):
                        px[oy + i][xl + d] = color
            # right diagonal: from top-right to middle
            xr = ox + cw - s - int((cw / 2 - s) * i / steps)
            for d in range(s):
                if 0 <= xr + d < ox + cw:
                    if oy + i < len(px):
                        px[oy + i][xr + d] = color


def make_icon(size, maskable=False):
    px = blank(size, size)
    bg = (BLUE[0], BLUE[1], BLUE[2], 255)
    rounded_bg(px, bg, radius=int(size * (0.18 if not maskable else 0.0)))
    if maskable:
        # full-bleed blue background (no rounded corners) for maskable safe zone
        fill_rect(px, 0, 0, size, size, bg)

    # Glyph region. Maskable keeps content within the inner 80% safe zone.
    inset = int(size * 0.30) if maskable else int(size * 0.22)
    region = size - 2 * inset
    letter_w = int(region * 0.40)
    gap = int(region * 0.12)
    total = letter_w * 2 + gap
    ox = (size - total) // 2
    oy = (size - region) // 2
    stroke = max(2, int(region * 0.16))
    fg = (WHITE[0], WHITE[1], WHITE[2], 255)
    draw_letter(px, "G", ox, oy, letter_w, region, stroke, fg)
    draw_letter(px, "M", ox + letter_w + gap, oy, letter_w, region, stroke, fg)
    return px


def make_badge(size):
    # Monochrome white glyph on transparent background (badges are tinted by the OS).
    px = blank(size, size)
    inset = int(size * 0.12)
    region = size - 2 * inset
    letter_w = int(region * 0.40)
    gap = int(region * 0.12)
    total = letter_w * 2 + gap
    ox = (size - total) // 2
    oy = (size - region) // 2
    stroke = max(2, int(region * 0.16))
    fg = (WHITE[0], WHITE[1], WHITE[2], 255)
    draw_letter(px, "G", ox, oy, letter_w, region, stroke, fg)
    draw_letter(px, "M", ox + letter_w + gap, oy, letter_w, region, stroke, fg)
    return px


def main():
    base = os.path.join(os.path.dirname(__file__), "..", "static", "icons")
    base = os.path.abspath(base)
    write_png(os.path.join(base, "icon-192.png"), 192, 192, make_icon(192))
    write_png(os.path.join(base, "icon-512.png"), 512, 512, make_icon(512))
    write_png(os.path.join(base, "icon-maskable-512.png"), 512, 512, make_icon(512, maskable=True))
    write_png(os.path.join(base, "icon-maskable-192.png"), 192, 192, make_icon(192, maskable=True))
    write_png(os.path.join(base, "badge-72.png"), 72, 72, make_badge(72))
    print("icons written to", base)


if __name__ == "__main__":
    main()
