---
name: crawl4ai-extract
description: Single-page structured JSON extraction using LLM or CSS/XPath
tools: crawl4ai, read, bash
---

Extract structured data from one live page with `crawl4ai`.

Use `output_format: json` and exactly one strategy:
- `json_extract`: clear natural-language extraction instructions; requires an LLM provider.
- `schema_path` + `extraction_config`: repeatable CSS/XPath extraction.

Never use Trafilatura, deep crawl, or `question`. Read and validate the saved JSON. Do not run without an extraction strategy or guess missing data. Use cache unless freshness requires `bypass_cache: true`; increase `timeout` for slow pages.

Return the URL, method, record count, artifact path, concise extracted data, and quality issues. If the LLM provider is missing, report it clearly.
