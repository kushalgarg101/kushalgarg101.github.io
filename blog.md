---
layout: default
title: Blog
permalink: /blog/
---

# Blog

<!-- FILL: short description of what you write about -->

<ul class="list">
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <span class="meta">{{ post.date | date: "%b %d, %Y" }}</span>
    </li>
  {% endfor %}
</ul>
