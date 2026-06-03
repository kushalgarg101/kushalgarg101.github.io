---
layout: default
title: Blog
permalink: /blog/
---

# Blog

<!-- FILL: short description of what you write about -->

<div class="posts-grid">
  {% for post in site.posts %}
    <article class="post-card">
      <div class="post-card-body">
        <h3 class="post-card-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
        <p class="post-card-excerpt">
          {% if post.summary %}
            {{ post.summary }}
          {% else %}
            {{ post.content | strip_html | truncatewords: 30 }}
          {% endif %}
        </p>
      </div>
      <footer class="post-card-footer">
        <span class="post-card-meta">
          {{ post.date | date: "%B %-d, %Y" }} | 
          {% assign words = post.content | number_of_words %}
          {% assign read_time = words | divided_by: 180 %}
          {% if read_time > 0 %}
            Estimated reading time: {{ read_time }} min
          {% else %}
            Estimated reading time: 1 min
          {% endif %}
          | Author: Kushal Garg
        </span>
      </footer>
    </article>
  {% endfor %}
</div>
