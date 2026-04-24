# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.2] - 2026-04-24

### Added

- Prompt templates `/crawl4ai-scrape` and `/crawl4ai-extract` for quick single-purpose workflows
- CHANGELOG.md, ROADMAP.md, TODO.md for project tracking
- npm and GitHub badges and links in README

### Changed

- Agents renamed: `crawler` → `crawl4ai-scrape`, `deep-crawler` → `crawl4ai-crawl`, `extractor` → `crawl4ai-extract`
- Agents no longer hardcode a model — use whatever model is active in pi
- Each agent now has explicit "SHOULD use" / "must NOT use" parameter guidance
- All comments and documentation translated from Polish to English
- All prompt templates renamed with `crawl4ai-` prefix: `/crawler` → `/crawl4ai`, `/scrape` → `/crawl4ai-scrape`, `/extract` → `/crawl4ai-extract`
- README expanded with Usage section (direct tool, prompt templates, subagent workflows)

## [0.1.0] - 2026-04-24

### Added

- `crawl4ai` tool — crawl any URL and extract clean Markdown/JSON via Crawl4AI CLI
- Slash commands:
  - `/crawl4ai-install` — create local Python venv and install crawl4ai
  - `/crawl4ai-test` — smoke test crawl on example.com
  - `/crawl4ai-status` — show resolved binary path and version
  - `/crawl4ai-clear-cache` — remove local `.crawl4ai/cache` and `.crawl4ai/robots`
  - `/crawl4ai-setup-agents` — symlink agent definitions to `~/.pi/agent/agents/`
- Agents for subagent workflows:
  - `crawl4ai-scrape` — single page scraping to markdown
  - `crawl4ai-crawl` — multi-page deep crawl (BFS/DFS/best-first)
  - `crawl4ai-extract` — structured data extraction (LLM or CSS/XPath)
- Prompt template `/crawler` with argument hint
- Custom TUI rendering for tool calls and results
- Output saved to `.crawl4ai/outputs/<domain>/<format>/` by default
- Cache enabled by default (`cache_mode=enabled`)
- Input validation: `json` format requires extraction strategy
- Published to npm as `pi-crawl4ai`
- MIT license
