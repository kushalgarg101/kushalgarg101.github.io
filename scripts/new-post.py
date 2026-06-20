#!/usr/bin/env python3
"""Create a new blog post folder with starter content.

Usage:
    python scripts/new-post.py "My Post Title"
    python scripts/new-post.py "My Post Title" --date 2026-07-15

This creates:
    blog/<slug>/
        post.md      <- Your content goes here
        images/      <- Put your images here

Then write your post in post.md. Reference images as: images/photo.png
When ready, run: python scripts/build.py
"""

import argparse
import re
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = REPO_ROOT / "blog"


def slugify(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def main():
    parser = argparse.ArgumentParser(description="Create a new blog post folder")
    parser.add_argument("title", help="Title of the blog post")
    parser.add_argument(
        "--date", default=None, help="Publish date (YYYY-MM-DD), defaults to today"
    )
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    args = parser.parse_args()

    post_date = args.date or date.today().isoformat()
    slug = slugify(args.title)
    post_dir = BLOG_DIR / slug

    if post_dir.exists():
        print(f"Error: {post_dir} already exists.")
        sys.exit(1)

    post_dir.mkdir(parents=True)
    (post_dir / "images").mkdir()

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    tags_str = ", ".join(tags) if tags else "Tag1, Tag2"

    post_content = f"""---
title: "{args.title}"
date: {post_date}
summary: "Write a short summary here."
tags: [{tags_str}]
---

Write your intro paragraph here.

---

<nav class="toc" aria-label="Table of Contents">
  <div class="toc-title">Contents</div>
  <ol class="toc-list">
    <li><a href="#section-1">Section 1 Title</a></li>
    <li><a href="#section-2">Section 2 Title</a></li>
  </ol>
</nav>

---

## <span id="section-1">1. Section Title</span>

Your content here.

---

## <span id="section-2">2. Section Title</span>

More content here. Add images like this:

<figure>
    <img src="images/your-image.png" alt="Description">
    <figcaption>Caption for the image.</figcaption>
</figure>
"""

    (post_dir / "post.md").write_text(post_content, encoding="utf-8")

    print(f"Created: {post_dir.relative_to(REPO_ROOT)}/")
    print(f"  post.md  <- Write your content here")
    print(f"  images/  <- Put your images here")
    print()
    print(f"Reference images as: images/your-image.png")
    print(f"When ready, run: python scripts/build.py")


if __name__ == "__main__":
    main()
