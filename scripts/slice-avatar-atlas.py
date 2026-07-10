from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "app" / "src" / "assets" / "pig-avatar-atlas.webp"
OUTPUT = ROOT / "app" / "public" / "avatars"
GRID_SIZE = 8


def grid_lines(atlas: Image.Image, horizontal: bool) -> list[tuple[int, int]]:
    length = atlas.height if horizontal else atlas.width
    cross_length = atlas.width if horizontal else atlas.height
    candidates: list[int] = []

    for position in range(length):
        light_pixels = 0
        for cross_position in range(cross_length):
            pixel = atlas.getpixel((cross_position, position) if horizontal else (position, cross_position))
            if min(pixel) > 235:
                light_pixels += 1
        if light_pixels / cross_length > 0.9:
            candidates.append(position)

    groups: list[list[int]] = []
    for position in candidates:
        if not groups or position > groups[-1][-1] + 1:
            groups.append([position])
        else:
            groups[-1].append(position)

    if len(groups) != GRID_SIZE + 1:
        raise RuntimeError(f"Expected 9 grid lines, found {len(groups)}")
    return [(group[0], group[-1]) for group in groups]


def main() -> None:
    atlas = Image.open(SOURCE).convert("RGB")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    vertical_lines = grid_lines(atlas, horizontal=False)
    horizontal_lines = grid_lines(atlas, horizontal=True)

    for index in range(GRID_SIZE * GRID_SIZE):
        column = index % GRID_SIZE
        row = index // GRID_SIZE
        left = vertical_lines[column][1] + 2
        top = horizontal_lines[row][1] + 2
        right = vertical_lines[column + 1][0] - 2
        bottom = horizontal_lines[row + 1][0] - 2
        avatar = atlas.crop((left, top, right, bottom)).resize((256, 256), Image.Resampling.LANCZOS)
        avatar.save(OUTPUT / f"pig-{index:02d}.webp", "WEBP", quality=88, method=6)


if __name__ == "__main__":
    main()
