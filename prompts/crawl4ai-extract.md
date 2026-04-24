---
name: crawl4ai-extract
description: Extract structured data (JSON) from a web page using LLM or CSS/XPath.
argument-hint: "<URL> <what to extract>"
tools: crawl4ai, read, bash
---

Extract structured data from the given URL using the `crawl4ai` tool.

URL: $1
What to extract: ${@:2}

Steps:
1. Use `crawl4ai` with `output_format: json` and `json_extract: "${@:2}"`
2. Read the saved output file
3. Validate and present the extracted data

Requirements:
- `output_format` must be `json`
- Must provide `json_extract` (LLM prompt) or `schema_path` + `extraction_config` (CSS/XPath)
- Do NOT use `deep_crawl` — JSON extraction works on single pages only
- If LLM provider is not configured in Crawl4AI, tell the user to set it up first
- If `crawl4ai` is not installed, tell the user to run `/crawl4ai-install`
