# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.1] - 2026-08-11

### Changed
- Update bundled agents with explicit BM25 guidance and restrictions
- Add interactive project/user/custom scope selection to `/crawl4ai-install`, with matching command arguments for non-interactive use
- Document a live token comparison across Crawl4AI, Trafilatura, and BM25 modes

### Fixed
- Create nested parent directories before Crawl4AI writes a regular custom `output_file`

## [0.3.0] - 2026-08-11

### Added
- Query-aware local BM25 filtering for regular Crawl4AI Markdown and Trafilatura Markdown/text via `bm25_query` and `bm25_threshold`
- Structural chunk filtering that preserves selected headings, links, image references, and tables

## [0.2.0] - 2026-08-11

### Added
- Optional `extractor: "trafilatura"` for token-efficient single-page Markdown or plain-text extraction
- Controls for Trafilatura links, formatting, images with alt/source fallback, and tables
- Paired artifact persistence under `.crawl4ai/outputs/<domain>/trafilatura/`: extracted content plus raw Crawl4AI HTML
- Isolated Trafilatura virtual environment installed by `/crawl4ai-install` to avoid Python dependency conflicts
- Unit tests for Trafilatura validation, argument mapping, raw-HTML parsing, and artifact paths

### Changed
- Scraping agent and prompt templates prefer Trafilatura for single-page reading
- Compress all bundled prompts and agent instructions in English to reduce context usage
- Trafilatura `output_file` persistence is handled by the extension while regular Crawl4AI outputs continue using direct CLI file output
- `/crawl4ai-status` reports Trafilatura availability and version

## [0.1.6] - 2026-08-11

### Fixed
- Detect Crawl4AI installed in the user-level `~/.pi/extensions/crawl4ai/.venv` directory while retaining the legacy fallback path
- Improve `/crawl4ai-status` feedback with a health check, binary path, working directory, timeout, and persistent footer status

## [0.1.5] - 2026-07-01

### Added
- `/crawl4ai-scrape-and-extract` chained workflow prompt template (scrape → structured extract)
- `prepublishOnly` script runs the test suite (`npm test`) before publishing
- Unit tests for `args.ts` CLI flag mapping (18 cases) and `resolve.ts` path/slug helpers (23 cases)

## [0.1.4] - 2026-07-01

### Fixed
- Issue #1: `output_format=json` + `deep_crawl` now reports the accurate "not supported by Crawl4AI" reason first, instead of a misleading "requires an extraction strategy" message

### Changed
- Extract crawl-request validation into a dependency-free `validate.ts` module

### Added
- Regression tests for `validateCrawlRequest` (`npm test`, Node's built-in test runner)
- Normalize `repository.url` to silence npm publish warning

## [0.1.3] - 2026-07-01

### Changed
- Migrate npm scope from `@mariozechner/*` to `@earendil-works/*` for pi 0.80.3 compatibility
- Update `renderResult` signature to pi 0.80.3 API (`expanded`/`isPartial` moved into an `options` object)

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
