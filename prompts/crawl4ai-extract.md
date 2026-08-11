---
name: crawl4ai-extract
description: Extract structured JSON from one page.
argument-hint: "<URL> <what to extract>"
tools: crawl4ai, read, bash
---

Extract from $1: ${@:2}

Use `output_format: json` with either:
- `json_extract: "${@:2}"` for LLM extraction, or
- `schema_path` + `extraction_config` for CSS/XPath extraction.

Do not use Trafilatura or deep crawl. Read and validate the saved JSON, then return a concise result and artifact path. If Crawl4AI is unavailable, suggest `/crawl4ai-install`; if LLM extraction lacks a provider, report that clearly.
