#!/usr/bin/env python3
"""
Crop PNG images to remove extra whitespace on all sides.
"""

import os
from PIL import Image, ImageChops
from pathlib import Path

def trim_whitespace(image):
    """
    Trim whitespace/transparent pixels from image borders.
    Returns the cropped image.
    """
    # Handle transparency
    if image.mode == 'RGBA':
        # Get alpha channel
        alpha = image.split()[-1]
        # Get bounding box of non-transparent pixels
        bbox = alpha.getbbox()
    else:
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        # Create a background image (white)
        bg = Image.new('RGB', image.size, (255, 255, 255))
        # Get difference to find non-white content
        diff = ImageChops.difference(image, bg)
        # Get bounding box
        bbox = diff.getbbox()

    if bbox:
        return image.crop(bbox)
    return image

def process_directory(input_dir, output_dir=None, overwrite=False):
    """
    Process all PNG files in the input directory.

    Args:
        input_dir: Directory containing PNG files
        output_dir: Directory to save cropped images (if None, uses input_dir)
        overwrite: If True, overwrites original files
    """
    input_path = Path(input_dir)
    output_path = Path(output_dir) if output_dir else input_path

    if not overwrite and output_dir:
        output_path.mkdir(parents=True, exist_ok=True)

    png_files = list(input_path.glob("*.png"))
    total = len(png_files)

    print(f"Found {total} PNG files to process...")

    for i, img_path in enumerate(png_files, 1):
        try:
            # Open image
            img = Image.open(img_path)
            original_size = img.size

            # Crop whitespace
            cropped = trim_whitespace(img)

            # Save
            if overwrite or not output_dir:
                output_file = img_path
            else:
                output_file = output_path / img_path.name

            cropped.save(output_file, 'PNG')

            new_size = cropped.size
            print(f"[{i}/{total}] {img_path.name}: {original_size} -> {new_size}")

        except Exception as e:
            print(f"[{i}/{total}] ERROR processing {img_path.name}: {e}")

    print(f"\nDone! Processed {total} images.")

if __name__ == "__main__":
    import sys

    # Default: process assets directory, overwrite originals
    assets_dir = Path(__file__).parent / "assets"

    if not assets_dir.exists():
        print(f"Error: {assets_dir} does not exist")
        sys.exit(1)

    print("This will crop whitespace from all PNG files in the assets directory.")
    print("Original files will be OVERWRITTEN.")
    response = input("Continue? (y/n): ").lower()

    if response != 'y':
        print("Cancelled.")
        sys.exit(0)

    process_directory(assets_dir, overwrite=True)
