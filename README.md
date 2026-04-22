# pi-crawl4ai

A production-ready [pi](https://github.com/mariozechner/pi) package that integrates [Crawl4AI](https://github.com/unclecode/crawl4ai) — an open-source LLM-friendly web crawler — as a custom tool and agent prompt.

## Install

```bash
pi install git:github.com/romek-rozen/pi-crawl4ai
```

Or clone into your workspace and keep the `.pi/` folder at the project root.

## What's included

- `extensions/crawl4ai/` — the full extension source (tool, commands, renderers)
- `prompts/crawler.md` — a dedicated Crawler agent prompt
- MIT license

## Quick start

1. **Install Crawl4AI** (inside pi):
   ```
   /crawl4ai-install
   ```
   This creates a Python venv and installs `crawl4ai` locally.

2. **Verify**:
   ```
   /crawl4ai-status
   /crawl4ai-test
   ```

3. **Crawl**:
   ```
   Crawl https://example.com and give me the markdown.
   ```

## Tool parameters

| Parameter | Description |
|-----------|-------------|
| `url` *(required)* | Target URL |
| `output_format` | `markdown` (default), `markdown-fit`, `md`, `md-fit`, `json`, `all` |
| `deep_crawl` | `bfs`, `dfs`, or `best-first` |
| `max_pages` | Limit for deep crawl |
| `question` | Natural-language question about the page |
| `json_extract` | LLM extraction prompt *(requires LLM provider configured in crawl4ai)* |
| `schema_path` | JSON schema file for structured extraction *(requires extraction_config)* |
| `extraction_config` | Extraction strategy config file (YAML/JSON) *(required with schema_path)* |
| `browser_config` / `crawler_config` | Key=value pairs |
| `bypass_cache` | Force fresh crawl |
| `output_file` | Save directly to a custom path |
| `timeout` | Seconds, default 60 |

## Commands

| Command | Purpose |
|---------|---------|
| `/crawl4ai-install` | Create local venv and install `crawl4ai` |
| `/crawl4ai-test` | Run a smoke test crawl on example.com |
| `/crawl4ai-status` | Show resolved binary path and version |
| `/crawl4ai-clear-cache` | Remove local `.crawl4ai/cache` and `.crawl4ai/robots` |

## JSON extraction requirements

`output_format=json` **requires** an extraction strategy:
- **LLM extraction**: pass `json_extract` (e.g. `"Extract all product prices"`). Requires a configured LLM provider in Crawl4AI (run `crwl` once interactively or set up `~/.crawl4ai/global.yml`).
- **CSS/XPath extraction**: pass `schema_path` + `extraction_config`. Example extraction config YAML:
  ```yaml
  type: json-css
  params:
    verbose: true
  ```

⚠️ `json` output with `deep_crawl` is **not supported** by Crawl4AI. Use `markdown` for deep crawls.

## Architecture

| File | Responsibility |
|------|----------------|
| `index.ts` | Entry point — wires everything into `ExtensionAPI` |
| `types.ts` | Typebox schemas + TypeScript interfaces |
| `tool.ts` | Tool definition, validation, and execution logic |
| `args.ts` | Maps friendly params to CLI flags |
| `resolve.ts` | Binary discovery, env vars, output path helpers |
| `runner.ts` | Spawns `crwl` with timeout, abort, and streaming |
| `render.ts` | Custom TUI rendering |
| `commands.ts` | Slash commands (`/crawl4ai-*`) |
| `format.ts` | Legacy truncation helper |

## Development

The extension runs inside pi’s extension loader. After modifying source, reload pi and use `/crawl4ai-status` or `/crawl4ai-test` to verify.

## Troubleshooting

- **"Binary not found"** → run `/crawl4ai-install` or set `CRAWL4AI_VENV=/path/to/venv`
- **"No default LLM provider configured"** → configure a provider in Crawl4AI before using `json_extract`
- **"the JSON object must be str, bytes or bytearray, not NoneType"** → usually missing `extraction_config` when using `schema_path`, or the page has no matching content
- **Stale cache** → run `/crawl4ai-clear-cache`
- **Timeouts** → increase `timeout` param for slow sites

## License

MIT — see [LICENSE](./LICENSE)
