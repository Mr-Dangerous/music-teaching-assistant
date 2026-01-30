#!/usr/bin/env python3
"""
Download SVG musical notation files from Wikimedia Commons with rate limiting.
Downloads one file every 30 seconds to avoid overloading the servers.
"""

import requests
import time
import os
import sys
from pathlib import Path
from urllib.parse import unquote

# Configuration
CATEGORY = "Category:SVG_simplified_musical_symbols"
OUTPUT_DIR = Path("assets/music_simplified_svg")
DELAY_SECONDS = 60  # Increased to avoid rate limits
API_URL = "https://commons.wikimedia.org/w/api.php"
MAX_RATE_LIMIT_ERRORS = 2  # Exit after 2 rate limit errors

# User-Agent required by Wikimedia
HEADERS = {
    "User-Agent": "MusicTeachingAssistant/1.0 (Educational music notation downloader; Python/requests)"
}

# Create session with headers
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

# Create output directory
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def get_category_files(category, limit=500):
    """Get list of files in a Wikimedia Commons category using the API."""
    files = []
    continue_token = None

    print(f"Fetching file list from {category}...")

    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category,
            "cmtype": "file",
            "cmlimit": min(limit - len(files), 500),  # API max is 500
            "format": "json"
        }

        if continue_token:
            params["cmcontinue"] = continue_token

        response = SESSION.get(API_URL, params=params)
        response.raise_for_status()
        data = response.json()

        members = data.get("query", {}).get("categorymembers", [])
        files.extend([m["title"] for m in members])

        print(f"  Found {len(files)} files so far...")

        # Check if there are more results
        if "continue" in data and len(files) < limit:
            continue_token = data["continue"]["cmcontinue"]
        else:
            break

    print(f"Total files found: {len(files)}")
    return files


def get_file_url(filename):
    """Get the direct URL for a file."""
    params = {
        "action": "query",
        "titles": filename,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json"
    }

    response = SESSION.get(API_URL, params=params)
    response.raise_for_status()
    data = response.json()

    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        imageinfo = page.get("imageinfo", [])
        if imageinfo:
            return imageinfo[0].get("url")

    return None


def download_file(url, output_path):
    """Download a file from URL to output_path."""
    response = SESSION.get(url, stream=True)
    response.raise_for_status()

    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)


def sanitize_filename(filename):
    """Convert MediaWiki filename to safe filesystem filename."""
    # Remove "File:" prefix
    if filename.startswith("File:"):
        filename = filename[5:]

    # Decode URL encoding and replace problematic characters
    filename = unquote(filename)
    filename = filename.replace(" ", "_")

    return filename


def main():
    print("=" * 70)
    print("Wikimedia Commons Music Notation SVG Downloader")
    print("=" * 70)
    print(f"Category: {CATEGORY}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Rate limit: 1 file every {DELAY_SECONDS} seconds")
    print(f"Exit after: {MAX_RATE_LIMIT_ERRORS} rate limit errors (429)")
    print("=" * 70)
    print()

    # Get list of files
    files = get_category_files(CATEGORY)

    if not files:
        print("No files found in category.")
        return

    # Check for existing files
    existing_files = set(f.name for f in OUTPUT_DIR.glob("*"))
    print(f"\nFound {len(existing_files)} files already downloaded.")
    print()

    # Download files one by one
    downloaded_count = 0
    skipped_count = 0
    rate_limit_errors = 0

    for i, filename in enumerate(files, 1):
        safe_filename = sanitize_filename(filename)
        output_path = OUTPUT_DIR / safe_filename

        # Skip if already downloaded
        if output_path.exists():
            print(f"[{i}/{len(files)}] SKIP: {safe_filename} (already exists)")
            skipped_count += 1
            continue

        try:
            # Get file URL
            print(f"[{i}/{len(files)}] Getting URL for: {filename}")
            file_url = get_file_url(filename)

            if not file_url:
                print(f"  ERROR: Could not get URL for {filename}")
                continue

            # Download file
            print(f"  Downloading: {file_url}")
            download_file(file_url, output_path)
            downloaded_count += 1

            file_size = output_path.stat().st_size
            print(f"  SUCCESS: Saved to {safe_filename} ({file_size:,} bytes)")

            # Wait before next download (except for last file)
            if i < len(files):
                print(f"  Waiting {DELAY_SECONDS} seconds before next download...")
                print()
                time.sleep(DELAY_SECONDS)

        except KeyboardInterrupt:
            print("\n\nDownload interrupted by user.")
            print(f"Downloaded: {downloaded_count} files")
            print(f"Skipped: {skipped_count} files")
            sys.exit(0)

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                rate_limit_errors += 1
                print(f"  ERROR: Rate limited (429) - {rate_limit_errors}/{MAX_RATE_LIMIT_ERRORS}")
                if rate_limit_errors >= MAX_RATE_LIMIT_ERRORS:
                    print(f"\n{'=' * 70}")
                    print(f"STOPPING: Hit rate limit {MAX_RATE_LIMIT_ERRORS} times")
                    print(f"Downloaded: {downloaded_count} new files")
                    print(f"Skipped: {skipped_count} existing files")
                    print(f"Total files in directory: {len(list(OUTPUT_DIR.glob('*')))}")
                    print(f"{'=' * 70}")
                    sys.exit(0)
            else:
                print(f"  ERROR downloading {filename}: {e}")
            print()

        except Exception as e:
            print(f"  ERROR downloading {filename}: {e}")
            print()

    print()
    print("=" * 70)
    print("Download complete!")
    print(f"Downloaded: {downloaded_count} new files")
    print(f"Skipped: {skipped_count} existing files")
    print(f"Total files in directory: {len(list(OUTPUT_DIR.glob('*')))}")
    print("=" * 70)


if __name__ == "__main__":
    main()
