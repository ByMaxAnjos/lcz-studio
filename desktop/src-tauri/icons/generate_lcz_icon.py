#!/usr/bin/env python3
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
MASTER_SIZE = 1024
BRAND_GREEN = "#2d5016"

# Authoritative WUDAPT LCZ colors (frontend/src/utils/lczPalette.ts), a
# built-up -> vegetated gradient — the actual classification palette users
# see on every map, used here as the icon's identity instead of a wordmark.
GRID_COLORS = [
    "#910019", "#ff0000", "#ca9146",
    "#ffd37f", "#a4cc51", "#61ae63",
    "#30a500", "#b3cc33", "#61ae63",
]


def rounded_rect_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def draw_master() -> Image.Image:
    image = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    mask = rounded_rect_mask(MASTER_SIZE, 220)

    bg = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), BRAND_GREEN)
    image.alpha_composite(Image.composite(bg, image, mask))

    draw = ImageDraw.Draw(image)

    cols = 3
    margin = 176
    gap = 28
    cell = (MASTER_SIZE - 2 * margin - (cols - 1) * gap) / cols
    radius = cell * 0.22

    for i, color in enumerate(GRID_COLORS):
        row, col = divmod(i, cols)
        x0 = margin + col * (cell + gap)
        y0 = margin + row * (cell + gap)
        draw.rounded_rectangle(
            (x0, y0, x0 + cell, y0 + cell), radius=radius, fill=color
        )

    return image


def save_pngs(master: Image.Image) -> None:
    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "256x256.png": 256,
    }

    master.save(ROOT / "icon-master.png")
    for name, size in sizes.items():
        master.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / name)


def save_iconset(master: Image.Image) -> None:
    iconset = ROOT / "icon.iconset"
    iconset.mkdir(exist_ok=True)

    sizes = {
        "icon_16x16.png": 16,
        "icon_16x16@2x.png": 32,
        "icon_32x32.png": 32,
        "icon_32x32@2x.png": 64,
        "icon_128x128.png": 128,
        "icon_128x128@2x.png": 256,
        "icon_256x256.png": 256,
        "icon_256x256@2x.png": 512,
        "icon_512x512.png": 512,
        "icon_512x512@2x.png": 1024,
    }

    for name, size in sizes.items():
        master.resize((size, size), Image.Resampling.LANCZOS).save(iconset / name)


def save_ico(master: Image.Image) -> None:
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master.save(ROOT / "icon.ico", sizes=sizes)


def main() -> None:
    master = draw_master()
    save_pngs(master)
    save_iconset(master)
    save_ico(master)


if __name__ == "__main__":
    main()
