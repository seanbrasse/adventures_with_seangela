#!/usr/bin/env python3
"""
Create a circular iOS app icon from a source image.
Usage: python3 create-icon.py <source-image>
Output: public/apple-touch-icon.png (180x180 circular icon with dark background)
"""

import sys
from PIL import Image, ImageDraw

def create_circular_icon(source_path, output_path="public/apple-touch-icon.png", size=180):
    # Open and prepare the source image
    img = Image.open(source_path)

    # Convert to RGB if necessary (remove alpha channel if present)
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGB')

    # Get dimensions
    width, height = img.size

    # Crop to square from center (focusing on the center of the image)
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim

    img = img.crop((left, top, right, bottom))

    # Resize to icon size
    img = img.resize((size, size), Image.Resampling.LANCZOS)

    # Create circular mask
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)

    # Create output image with dark background
    output = Image.new('RGB', (size, size), (0, 0, 0))  # Black background

    # Paste the circular image
    output.paste(img, (0, 0), mask)

    # Save
    output.save(output_path, 'PNG')
    print(f"Created circular icon: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 create-icon.py <source-image>")
        print("Example: python3 create-icon.py photo.jpg")
        sys.exit(1)

    create_circular_icon(sys.argv[1])
