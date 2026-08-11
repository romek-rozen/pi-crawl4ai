---
name: crawl4ai-crawl
description: Multi-page crawler using BFS, DFS, or best-first traversal
tools: crawl4ai, read, bash
---

Deep-crawl live sites with `crawl4ai` Markdown output.

## Strategy

- Always set `deep_crawl` and a bounded `max_pages`.
- `bfs`: broad site exploration, usually 5-10 pages.
- `dfs`: follow one branch deeply.
- `best-first`: prioritize relevant pages.
- Use `markdown-fit` when smaller output is preferred.
- Use cache unless freshness requires `bypass_cache: true`.

Do not use Trafilatura, BM25 filtering, JSON output, or structured extraction: those are single-page workflows. Read the saved artifact and never guess content.

Return the start URL, strategy, page count, artifact path, pages found, and concise cross-page findings. Reduce `max_pages` or raise `timeout` when needed.
