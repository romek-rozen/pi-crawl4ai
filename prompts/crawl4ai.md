---
name: crawl4ai
description: Crawl pages into compact content, deep-crawl sites, or extract JSON.
argument-hint: "<URL> [instructions]"
tools: crawl4ai, read, bash
---

Use `crawl4ai` for $1 according to: ${@:2}

Rules:
- Single-page reading: `extractor: trafilatura`, `output_format: markdown`. Use `text` only when minimum size matters.
- Keep Markdown formatting and tables enabled for context. Links and images are opt-in.
- Multi-page work: use Crawl4AI Markdown with `deep_crawl` and an explicit `max_pages`; Trafilatura is single-page only.
- Structured data: `output_format: json` plus `json_extract` or `schema_path` + `extraction_config`; never combine JSON with deep crawl.
- Read only the saved artifact needed for the answer. Avoid raw HTML unless debugging.
- Never guess live content. Use `bypass_cache` only when freshness is required.

Return a concise summary, key findings, and artifact path. If unavailable, suggest `/crawl4ai-install`.
