"""Refresh lightweight board artwork without changing the original PNG files.
Run from the repository root with Python and Pillow installed.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
source = ROOT / 'public/monopoly/tiles'
output = source / 'board'
output.mkdir(exist_ok=True)
for position in range(40):
    name = f'tile-{position:02d}'
    with Image.open(source / f'{name}.png') as original:
        bounds = (420, 420) if position % 10 == 0 else (320, 560)
        thumbnail = ImageOps.contain(original.convert('RGB'), bounds, Image.Resampling.LANCZOS)
        thumbnail.save(output / f'{name}.webp', 'WEBP', quality=86, method=6)
print('Updated 40 board thumbnails. Original PNG files are unchanged.')
