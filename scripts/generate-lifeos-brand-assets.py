#!/usr/bin/env python3
"""
LifeOS brand asset generator.

Regenerates the LifeOS logo (SVG) and all raster brand assets (favicons,
PWA icons, OG image) from a single geometric mark definition so the whole
icon set stays visually consistent.

Usage:  python3 scripts/generate-lifeos-brand-assets.py

The mark: a rounded-square tile with an indigo->teal gradient and three
ascending rounded bars (growth / personal dashboard). Deliberately simple,
neutral, and unrelated to the upstream NeumanOS logo.
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGOS_DIR = os.path.join(ROOT, "public", "images", "logos")
FAVICON_DIR = os.path.join(ROOT, "public", "images", "favicon")
PUBLIC_DIR = os.path.join(ROOT, "public")

GRAD_TOP = (99, 102, 241)     # indigo-500
GRAD_BOTTOM = (20, 184, 166)  # teal-500
BAR_COLOR = (255, 255, 255)
TEXT_DARK = (15, 23, 42)      # slate-900
TEXT_LIGHT = (248, 250, 252)  # slate-50
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


# ---------------------------------------------------------------- SVG marks

def mark_svg(size=64, tile=True):
    """Standalone LifeOS icon mark as SVG source."""
    body = f'''  <defs>
    <linearGradient id="lifeos-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6366F1"/>
      <stop offset="1" stop-color="#14B8A6"/>
    </linearGradient>
  </defs>'''
    if tile:
        body += f'''
  <rect width="{size}" height="{size}" rx="{round(size * 0.22)}" fill="url(#lifeos-g)"/>'''
    else:
        body += '''
  <rect width="SIZE" height="SIZE" fill="none"/>'''.replace("SIZE", str(size))
    # Three ascending rounded bars
    bw = size * 0.13
    gap = size * 0.075
    base = size * 0.80
    total_w = bw * 3 + gap * 2
    x0 = (size - total_w) / 2
    heights = [0.30, 0.48, 0.66]
    bars = ""
    for i, h in enumerate(heights):
        x = x0 + i * (bw + gap)
        y = base - size * h
        bars += f'''
  <rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{size * h:.1f}" rx="{bw / 2:.1f}" fill="#FFFFFF"/>'''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">\n{body}{bars}\n</svg>\n'


def wordmark_svg(text_color, bg="transparent"):
    """Full lockup: icon mark + 'LifeOS' wordmark (for sidebar/header)."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 56" role="img" aria-label="LifeOS">
  <defs>
    <linearGradient id="lifeos-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6366F1"/>
      <stop offset="1" stop-color="#14B8A6"/>
    </linearGradient>
  </defs>
  <rect width="220" height="56" fill="{bg}"/>
  <rect x="2" y="4" width="48" height="48" rx="11" fill="url(#lifeos-g)"/>
  <rect x="12.5" y="33.2" width="6.2" height="14" rx="3.1" fill="#FFFFFF"/>
  <rect x="22.9" y="27" width="6.2" height="20.2" rx="3.1" fill="#FFFFFF"/>
  <rect x="33.3" y="20.4" width="6.2" height="26.8" rx="3.1" fill="#FFFFFF"/>
  <text x="62" y="39" font-family="'Segoe UI', system-ui, -apple-system, sans-serif"
        font-size="30" font-weight="700" letter-spacing="0.5" fill="{text_color}">LifeOS</text>
</svg>
'''


def write_svgs():
    os.makedirs(LOGOS_DIR, exist_ok=True)
    with open(os.path.join(LOGOS_DIR, "lifeos-logo.svg"), "w") as f:
        f.write(wordmark_svg("#0F172A"))
    with open(os.path.join(LOGOS_DIR, "lifeos-logo-white.svg"), "w") as f:
        f.write(wordmark_svg("#F8FAFC"))
    with open(os.path.join(LOGOS_DIR, "lifeos-icon.svg"), "w") as f:
        f.write(mark_svg(64))
    with open(os.path.join(FAVICON_DIR, "favicon.svg"), "w") as f:
        f.write(mark_svg(64))
    print("svg assets written")


# ---------------------------------------------------------------- PNG icons

def draw_tile(px):
    """Render the tiled LifeOS mark at `px` resolution with PIL."""
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded-square gradient tile
    radius = int(px * 0.22)
    grad = Image.new("RGBA", (px, px))
    gdraw = ImageDraw.Draw(grad)
    for y in range(px):
        t = y / max(px - 1, 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(GRAD_TOP, GRAD_BOTTOM)) + (255,)
        gdraw.line([(0, y), (px, y)], fill=color)
    mask = Image.new("L", (px, px), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, px - 1, px - 1], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)

    # Ascending rounded bars
    bw = px * 0.13
    gap = px * 0.075
    baseline = px * 0.80
    total_w = bw * 3 + gap * 2
    x0 = (px - total_w) / 2
    for i, h in enumerate([0.30, 0.48, 0.66]):
        x = x0 + i * (bw + gap)
        draw.rounded_rectangle(
            [x, baseline - px * h, x + bw, baseline],
            radius=bw / 2,
            fill=BAR_COLOR + (255,),
        )
    return img


def write_icons():
    os.makedirs(FAVICON_DIR, exist_ok=True)
    targets = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "favicon-96x96.png": 96,
        "apple-touch-icon.png": 180,
        "android-chrome-192x192.png": 192,
        "android-chrome-512x512.png": 512,
        "web-app-manifest-192x192.png": 192,
        "web-app-manifest-512x512.png": 512,
    }
    rendered = {px: draw_tile(px) for px in (16, 32, 96, 180, 192, 512)}
    for name, px in targets.items():
        rendered[px].save(os.path.join(FAVICON_DIR, name))
    # Multi-resolution favicon.ico
    ico_sizes = [16, 32, 48]
    base = draw_tile(256)
    base.save(os.path.join(FAVICON_DIR, "favicon.ico"),
              sizes=[(s, s) for s in ico_sizes])
    print("png favicon/pwa icons written")


# ---------------------------------------------------------------- OG image

def write_og_image():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h))
    draw = ImageDraw.Draw(img)
    # Dark slate background with subtle vertical gradient
    top, bottom = (10, 14, 39), (23, 37, 84)
    for y in range(h):
        t = y / (h - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)) + (255,)
        draw.line([(0, y), (w, y)], fill=color)

    # Centered lockup
    tile = draw_tile(168)
    word_font = ImageFont.truetype(FONT_BOLD, 110)
    sub_font = ImageFont.truetype(FONT_BOLD, 34)

    tw = draw.textlength("LifeOS", font=word_font)
    group_w = 168 + 36 + tw
    gx = (w - group_w) / 2
    gy = h / 2 - 120

    img.alpha_composite(tile, (int(gx), int(gy)))
    bbox = draw.textbbox((0, 0), "LifeOS", font=word_font)
    text_y = gy + (168 - (bbox[3] - bbox[1])) / 2 - bbox[1]
    draw.text((gx + 168 + 36, text_y), "LifeOS", font=word_font, fill=TEXT_LIGHT)

    sub = "本地优先的个人综合管理平台 · A local-first personal workspace"
    sw = draw.textlength(sub, font=sub_font)
    draw.text(((w - sw) / 2, gy + 230), sub, font=sub_font, fill=(148, 163, 184, 255))

    img.convert("RGB").save(os.path.join(PUBLIC_DIR, "images", "og-image.png"), "PNG")
    print("og-image written")


if __name__ == "__main__":
    write_svgs()
    write_icons()
    write_og_image()
