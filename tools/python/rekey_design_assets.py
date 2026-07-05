from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


BG = (0xFD, 0xF8, 0xF3)
TOLERANCE = 13
FRINGE_TOLERANCE = 26

ROOT = Path(__file__).resolve().parents[1]
PNG_PATHS = [
    ROOT / "apps/worker/public/assets/brand/logo.png",
    ROOT / "apps/worker/public/assets/brand/paw.png",
    ROOT / "apps/worker/public/assets/illustrations/cat-invalid-qr.png",
    ROOT / "apps/worker/public/assets/illustrations/cat-notfound.png",
    ROOT / "apps/worker/public/assets/illustrations/cat-missing-empty.png",
    ROOT / "apps/worker/public/assets/illustrations/vet-cat.png",
]


def within_tolerance(rgb: tuple[int, int, int], tolerance: int) -> bool:
    return all(abs(channel - target) <= tolerance for channel, target in zip(rgb, BG))


def build_background_mask(img: Image.Image) -> list[list[bool]]:
    width, height = img.size
    pixels = img.load()
    visited = [[False for _ in range(width)] for _ in range(height)]
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if visited[y][x]:
            return
        if within_tolerance(pixels[x, y][:3], TOLERANCE):
            visited[y][x] = True
            q.append((x, y))

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and not visited[ny][nx]:
                if within_tolerance(pixels[nx, ny][:3], TOLERANCE):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    return visited


def has_background_neighbor(mask: list[list[bool]], x: int, y: int) -> bool:
    height = len(mask)
    width = len(mask[0])
    for ny in range(max(0, y - 1), min(height, y + 2)):
        for nx in range(max(0, x - 1), min(width, x + 2)):
            if mask[ny][nx]:
                return True
    return False


def process(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    bg_mask = build_background_mask(img)

    alpha = Image.new("L", img.size, 255)
    alpha_pixels = alpha.load()

    for y in range(height):
        for x in range(width):
            rgb = pixels[x, y][:3]
            if bg_mask[y][x]:
                alpha_pixels[x, y] = 0
                continue
            if has_background_neighbor(bg_mask, x, y) and within_tolerance(rgb, FRINGE_TOLERANCE):
                distance = max(abs(channel - target) for channel, target in zip(rgb, BG))
                alpha_pixels[x, y] = max(96, min(255, int((distance / FRINGE_TOLERANCE) * 255)))

    # Clean the 1px fringe while keeping interior detail intact.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    img.putalpha(alpha)
    img.save(path)


def main() -> None:
    for path in PNG_PATHS:
        process(path)
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
