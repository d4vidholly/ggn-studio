"""
Run this after replacing any PNG source file.
  python convert-webp.py
Converts every PNG listed below to WebP alongside the original.
"""

from PIL import Image
import os

# Add any new files here as (source, output, quality)
FILES = [
    ("client_sticker.png",       "client_sticker.webp",       90),
    ("GGN.png",                  "GGN.webp",                  95),
    ("GGN2.png",                 "GGN2.webp",                 95),
    ("logo_white.png",           "logo_white.webp",           90),
    ("logo_black.png",           "logo_black.webp",           90),
    ("album/Primary/1.png",      "album/Primary/1.webp",      85),
    ("album/Primary/2.png",      "album/Primary/2.webp",      85),
    ("album/Primary/3.png",      "album/Primary/3.webp",      85),
    ("album/Primary/4.png",      "album/Primary/4.webp",      85),
    ("album/Primary/5.png",      "album/Primary/5.webp",      85),
    ("album/Primary/6.jpg",      "album/Primary/6.webp",      85),
]

base = os.path.dirname(os.path.abspath(__file__))

for src, dst, quality in FILES:
    src_path = os.path.join(base, src)
    dst_path = os.path.join(base, dst)
    if not os.path.exists(src_path):
        print(f"SKIP  {src}  (not found)")
        continue
    Image.open(src_path).save(dst_path, "WEBP", quality=quality)
    src_kb = os.path.getsize(src_path) // 1024
    dst_kb = os.path.getsize(dst_path) // 1024
    print(f"OK    {src} ({src_kb}KB) -> {dst} ({dst_kb}KB)")
