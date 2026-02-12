---
layout: default
title: Research Notes
permalink: /notes/
---

# Research Notes

<!-- FILL: short description of your notes/research topics -->

<ul class="list">
  {% for note in site.notes %}
    <li>
      <a href="{{ note.url | relative_url }}">{{ note.title }}</a>
      <span class="meta">{{ note.date | date: "%b %d, %Y" }}</span>
    </li>
  {% endfor %}
</ul>
