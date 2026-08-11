---
name: crawl4ai-scrape-and-extract
description: Compactly scrape one page, then extract structured JSON.
argument-hint: "<URL> <fields to extract>"
tools: crawl4ai, read, bash
---

Process $1 and extract: ${@:2}

1. Scrape with `extractor: trafilatura`, `output_format: markdown`. Keep formatting and tables; links/images are opt-in. Read the extracted Markdown, not raw HTML.
2. Crawl the same URL with `output_format: json` and `json_extract: "${@:2}"`, or use `schema_path` + `extraction_config`.
3. Validate the JSON and return a concise content summary, extracted data, and both artifact paths.

Do not use deep crawl. If unavailable, suggest `/crawl4ai-install`; report missing LLM configuration clearly.
