# crawl4ai Extension for pi

Integrates [Crawl4AI](https://github.com/unclecode/crawl4ai) — open-source LLM-friendly web crawler — as a custom pi tool for any pi workspace.

## Quick Start

1. **Install** (inside pi):
   ```
   /crawl4ai-install
   ```
   This creates a Python venv inside `.pi/extensions/crawl4ai/.venv` and installs `crawl4ai`.
   The crawler uses the project-local `.crawl4ai/` folder by default (via `CRAWL4_AI_BASE_DIRECTORY`).

2. **Verify**:
   ```
   /crawl4ai-status
   ```

3. **Use** — just ask the agent to crawl something:
   ```
   Crawl https://example.com and give me the markdown.
   ```

## Architecture

The extension is split into small, single-purpose modules:

| File | Responsibility |
|------|----------------|
| `crawl4ai.ts` | Entry point — wires everything into `ExtensionAPI` |
| `types.ts` | Typebox schemas + TypeScript interfaces |
| `resolve.ts` | Locates `crwl` binary and prepares venv env vars |
| `runner.ts` | Spawns `crwl crawl` with timeout, abort, and streaming |
| `args.ts` | Maps friendly `CrawlParams` to CLI flags |
| `format.ts` | Legacy truncation/formatting helper (not used by the current output flow) |
| `render.ts` | Custom TUI rendering for tool calls and results |
| `tool.ts` | Tool definition (`crawl4ai`) and `execute` logic |
| `commands.ts` | Slash commands: `/crawl4ai-install`, `/crawl4ai-doctor`, `/crawl4ai-status` |

## Tool Parameters

The LLM sees a tool named `crawl4ai` with these parameters:

- `url` *(required)* — target URL
- `output_format` — `markdown` (default), `markdown-fit`, `md`, `md-fit`, `json`, `all` (`json` requires `json_extract` or `schema_path`)
- `deep_crawl` — `bfs`, `dfs`, or `best-first`
- `max_pages` — limit for deep crawl
- `question` — natural-language question about the page
- `json_extract` — LLM extraction prompt *(requires LLM provider configured in crawl4ai)*
- `schema_path` — JSON schema file for structured extraction *(requires LLM provider)*
- `browser_config` / `crawler_config` — key=value pairs
- `bypass_cache` — force fresh crawl (`--bypass-cache`)
- `output_file` — save directly to disk (bypasses inline truncation)
- `timeout` — seconds, default 60

## Commands

| Command | Purpose |
|---------|---------|
| `/crawl4ai-install` | Create local venv and install `crawl4ai` |
| `/crawl4ai-test` | Run a smoke test crawl on example.com |
| `/crawl4ai-status` | Show resolved binary path and version |
| `/crawl4ai-clear-cache` | Remove local `.crawl4ai/cache` and `.crawl4ai/robots` |

## LLM Extraction Setup

If you want `json_extract` or `schema_path` to work, configure an LLM provider inside crawl4ai (e.g. via environment variables or `~/.crawl4ai/config.yml`). See the [Crawl4AI docs](https://docs.crawl4ai.com) for details.

By default the extension sets `CRAWL4_AI_BASE_DIRECTORY` to the current project root so Crawl4AI can reuse the project-local `.crawl4ai/` cache.
The tool also forces `cache_mode=enabled` unless you explicitly pass `bypass_cache: true` or your own `crawler_config`.
Full crawl outputs are written to `.crawl4ai/outputs/<domain>/<format>/` unless you pass `output_file`.
The inline response only points to the saved file path; use `read` to inspect content.

## Troubleshooting

- **"Binary not found"** → run `/crawl4ai-install` or set `CRAWL4AI_VENV=/path/to/venv` before starting pi.
- **Browser errors** → run `/crawl4ai-test` to verify crawl4ai works.
- **Stale cache** → run `/crawl4ai-clear-cache` to remove local cache folders.
- **No cache files** → check whether the call used `bypass_cache`; the extension now defaults to `cache_mode=enabled`.
- **Where are crawl outputs?** → look under `.crawl4ai/outputs/<domain>/<format>/`.
- **JSON output errors** → `output_format=json` needs `json_extract` or `schema_path`.
- **Timeouts** → increase `timeout` param for slow sites.
