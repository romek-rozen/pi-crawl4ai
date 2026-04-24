# Roadmap

## v0.2.0 — Configuration & control

- **LLM provider configuration** — set up the LLM provider for Crawl4AI (OpenAI, Anthropic, etc.) directly from pi, without manually editing `~/.crawl4ai/global.yml`. Possible `/crawl4ai-config` command.
- **Response length control** — parameter to limit or expand inline preview length (e.g. default 100 chars, option for 500+). Useful for quick summaries vs. detailed extraction.
- **Auto-setup agents** — automatically symlink agents on `session_start` instead of requiring `/crawl4ai-setup-agents`.

## v0.3.0 — Dashboard & history

- **Crawl dashboard** — view crawl history and progress from `.crawl4ai/outputs/`. Show timeline, domain stats, output sizes. Possible `/crawl4ai-dashboard` command or custom TUI component.
- **Crawl history search** — search and filter past crawl outputs by domain, date, format.
- **Usage statistics** — track crawl counts, total bytes, cache hit rate.

## Future

- **Workflow prompt templates** — pre-built chains like `/scrape-and-extract` (scrape page, then extract structured data).
- **Better TUI progress** — real-time progress bar during crawl with page count, bytes downloaded, ETA.
- **Parallel crawl support** — crawl multiple URLs in parallel within a single tool call.
- **Crawl profiles** — saved configurations for common crawl patterns (e.g. "documentation site", "e-commerce product pages").
