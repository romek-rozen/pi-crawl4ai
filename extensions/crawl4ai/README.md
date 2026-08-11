# crawl4ai Extension for pi

Integrates [Crawl4AI](https://github.com/unclecode/crawl4ai) with optional [Trafilatura](https://trafilatura.readthedocs.io/) extraction as a custom pi tool for any workspace.

## Quick Start

1. **Install** (inside pi):
   ```
   /crawl4ai-install
   ```
   This creates `.pi/extensions/crawl4ai/.venv` for Crawl4AI and a separate `.trafilatura-venv` for Trafilatura. Isolation avoids conflicting Python dependencies.
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
| `trafilatura.ts` | Parses raw HTML and runs Trafilatura through stdin |
| `args.ts` | Maps friendly `CrawlParams` to CLI flags |
| `format.ts` | Legacy truncation/formatting helper (not used by the current output flow) |
| `render.ts` | Custom TUI rendering for tool calls and results |
| `tool.ts` | Tool definition (`crawl4ai`) and `execute` logic |
| `commands.ts` | Slash commands: `/crawl4ai-install`, `/crawl4ai-test`, `/crawl4ai-status`, cache/agent setup |

## Tool Parameters

The LLM sees a tool named `crawl4ai` with these parameters:

- `url` *(required)* — target URL
- `output_format` — `markdown` (default), `markdown-fit`, `md`, `md-fit`, `json`, `all`; `text` is available with Trafilatura
- `extractor` — `trafilatura` for compact single-page Markdown/text
- `include_links` — preserve link targets (off by default)
- `include_formatting` — preserve Markdown headings/emphasis (on by default for Markdown)
- `include_images` — include detected images with alt text and resolved source URLs (off by default)
- `include_tables` — preserve tables (on by default; disable for smaller output)
- `deep_crawl` — `bfs`, `dfs`, or `best-first` (not with Trafilatura)
- `max_pages` — limit for deep crawl
- `question` — natural-language question about the page
- `json_extract` — LLM extraction prompt *(requires LLM provider configured in crawl4ai)*
- `schema_path` — JSON schema file for structured CSS/XPath extraction *(requires `extraction_config`)*
- `extraction_config` — YAML/JSON extraction strategy used with `schema_path`
- `browser_config` / `crawler_config` — key=value pairs
- `bypass_cache` — force fresh crawl (`--bypass-cache`)
- `output_file` — choose a custom artifact path; tool responses remain path-only
- `timeout` — seconds, default 60

## Commands

| Command | Purpose |
|---------|---------|
| `/crawl4ai-install` | Create isolated venvs and install Crawl4AI + Trafilatura |
| `/crawl4ai-test` | Run a smoke test crawl on example.com |
| `/crawl4ai-status` | Show binary path and health check; keep a compact status in the footer |
| `/crawl4ai-clear-cache` | Remove local `.crawl4ai/cache` and `.crawl4ai/robots` |

## Trafilatura mode

Set `extractor: "trafilatura"` for token-efficient single-page extraction. `output_format` is independent and may be `markdown`/`md` or `text`. Crawl4AI fetches the page and returns raw HTML internally; Trafilatura processes it locally without an LLM.

Both artifacts are retained:

```text
.crawl4ai/outputs/<domain>/trafilatura/<timestamp>-<slug>.md
.crawl4ai/outputs/<domain>/trafilatura/<timestamp>-<slug>.raw.html
```

Plain text uses `.txt`. With a custom `output_file`, raw HTML is written beside it as `<name>.raw.html`. Markdown formatting and tables are retained by default because they carry document context. Links and images are opt-in. The extension restores GFM table structure from Crawl4AI Markdown when Trafilatura flattens cells. `include_images=true` enables Trafilatura image extraction and supplements pruned images from Crawl4AI metadata, preserving their `alt` text and resolved source URL. Trafilatura does not support `deep_crawl`, questions, or structured extraction in the same request. The inline tool result contains paths only.

See the root README for a documented `https://pi.dev/` comparison.

## LLM Extraction Setup

If you want `json_extract` or `schema_path` to work, configure an LLM provider inside crawl4ai (e.g. via environment variables or `~/.crawl4ai/config.yml`). See the [Crawl4AI docs](https://docs.crawl4ai.com) for details.

By default the extension sets `CRAWL4_AI_BASE_DIRECTORY` to the current project root so Crawl4AI can reuse the project-local `.crawl4ai/` cache.
The tool also forces `cache_mode=enabled` unless you explicitly pass `bypass_cache: true` or your own `crawler_config`.
Full crawl outputs are written to `.crawl4ai/outputs/<domain>/<format>/` unless you pass `output_file`. Trafilatura artifacts use `.crawl4ai/outputs/<domain>/trafilatura/`.
The inline response only points to saved file paths; use `read` only when content inspection is needed.

## Troubleshooting

- **"Binary not found"** → the extension automatically checks project-local and `~/.pi/extensions/crawl4ai/.venv` installations; otherwise run `/crawl4ai-install` or set `CRAWL4AI_VENV=/path/to/venv` before starting pi.
- **Browser errors** → run `/crawl4ai-test` to verify crawl4ai works.
- **Trafilatura missing** → run `/crawl4ai-install` or set `TRAFILATURA_VENV`; raw HTML remains available if extraction cannot start.
- **Stale cache** → run `/crawl4ai-clear-cache` to remove local cache folders.
- **No cache files** → check whether the call used `bypass_cache`; the extension now defaults to `cache_mode=enabled`.
- **Where are crawl outputs?** → look under `.crawl4ai/outputs/<domain>/<format>/`.
- **JSON output errors** → `output_format=json` needs `json_extract` or `schema_path`.
- **Timeouts** → increase `timeout` param for slow sites.
