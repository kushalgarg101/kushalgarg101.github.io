# Blog Posts

Each folder here is a blog post. To create a new post:

```bash
python scripts/new-post.py "My Post Title"
```

This creates `my-post-title/` with:
- `post.md` - Write your content here
- `images/` - Put your images here

Reference images in your post as `images/photo.png`.

When ready to publish:

```bash
python scripts/build.py
```

This compiles everything into Jekyll format (`_posts/` and `assets/images/`).

Then preview locally:

```powershell
.\scripts\local-jekyll-preview.ps1
```

## Structure

```
blog/
  my-post-title/
    post.md        <- Your content (write here)
    images/        <- Your images (put them here)
      photo.png
```

## Post Format

Each `post.md` starts with front matter:

```yaml
---
title: "My Post Title"
date: 2026-07-15
summary: "A short summary shown on the blog listing page."
tags: [Tag1, Tag2]
---
```

Then write your content using standard Markdown + HTML. MathJax works with `\(...\)` inline and `\[...\]` display.
