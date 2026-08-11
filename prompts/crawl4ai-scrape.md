---
name: crawl4ai-scrape
description: Scrape one page into compact Markdown or text.
argument-hint: "<URL> [instructions]"
tools: crawl4ai, read, bash
---

Scrape $1 according to: ${@:2}

Use `extractor: trafilatura` with `output_format: markdown`; use `text` only when minimum size is requested. Keep formatting and tables enabled. Enable links or images only when needed.

Read the extracted artifact, not raw HTML, then return a concise summary and path. Do not use deep crawl or JSON extraction. If unavailable, suggest `/crawl4ai-install`.
