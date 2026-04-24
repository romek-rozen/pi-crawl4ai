---
name: crawl4ai-scrape
description: Scrape a single web page and extract clean markdown content.
argument-hint: "<URL> [instructions]"
tools: crawl4ai, read, bash
---

Scrape the given URL using the `crawl4ai` tool with `output_format: markdown`.

URL: $1
Instructions: ${@:2}

Steps:
1. Crawl the URL with `output_format: markdown` (or `markdown-fit` if compact output requested)
2. Read the saved output file
3. Summarize key content for the user

Do NOT use `deep_crawl` or `json_extract` — this is a single-page scrape only.
If `crawl4ai` is not installed, tell the user to run `/crawl4ai-install`.
