from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/upload/197045.png")
TARGETS = {
    "icon.png": 512,
    "splash-icon.png": 640,
    "android-icon-foreground.png": 512,
    "favicon.png": 192,
}
ASSET_DIRECTORY = Path("/home/ubuntu/omni-life-center/assets/images")


def optimize_logo(target: Path, maximum_size: int) -> None:
    with Image.open(SOURCE) as source:
        image = source.convert("RGBA")
        image.thumbnail((maximum_size, maximum_size), Image.Resampling.LANCZOS)
        image.save(target, format="PNG", optimize=True, compress_level=9)


for filename, size in TARGETS.items():
    optimize_logo(ASSET_DIRECTORY / filename, size)
    print(f"{filename}: {(ASSET_DIRECTORY / filename).stat().st_size} bytes")
