---
name: crawl4ai-scrape-and-extract
description: Chained workflow — scrape a page to clean markdown, then extract structured data (JSON) from it.
argument-hint: "<URL> <fields to extract>"
tools: crawl4ai, read, bash
---

Scrape the given URL to clean markdown, then run a structured extraction on the same page using the `crawl4ai` tool.

URL: $1
Fields to extract: ${@:2}

Step 1 — Scrape:
1. Crawl the URL with `output_format: markdown`, saving to the project outputs
2. Read the saved output file
3. Summarize the key content for the user

Step 2 — Extract:
1. Run `crawl4ai` again on the SAME url with `output_format: json` and `json_extract: "${@:2}"` (or `schema_path` + `extraction_config` for CSS/XPath)
2. Read the saved output file
3. Validate and present the extracted structured data

Requirements:
- `output_format: json` REQUIRES an extraction strategy — provide `json_extract` (LLM prompt) or `schema_path` + `extraction_config` (CSS/XPath)
- Do NOT use `deep_crawl` — JSON extraction works on single pages only
- If LLM provider is not configured in Crawl4AI, tell the user to set it up first
- If `crawl4ai` is not installed, tell the user to run `/crawl4ai-install`
