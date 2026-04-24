# pi-crawl4ai

[![npm](https://img.shields.io/npm/v/pi-crawl4ai)](https://www.npmjs.com/package/pi-crawl4ai)
[![GitHub](https://img.shields.io/github/license/romek-rozen/pi-crawl4ai)](https://github.com/romek-rozen/pi-crawl4ai)
[![Built with Crawl4AI](https://img.shields.io/badge/Built%20with-Crawl4AI-blue)](https://github.com/unclecode/crawl4ai)
[![Built for pi](https://img.shields.io/badge/Built%20for-pi-green)](https://github.com/mariozechner/pi)

A production-ready [pi](https://github.com/mariozechner/pi) package that integrates [Crawl4AI](https://github.com/unclecode/crawl4ai) — an open-source LLM-friendly web crawler — as a custom tool and agent prompt.

## Install

```bash
pi install npm:pi-crawl4ai
```

Or from git:

```bash
pi install git:github.com/romek-rozen/pi-crawl4ai
```

## What's included

- `extensions/crawl4ai/` — the full extension source (tool, commands, renderers)
- `agents/` — specialized agent definitions for use with subagent/run
- `prompts/crawler.md` — a dedicated Crawler prompt template
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

3. **Set up agents** (optional, for subagent workflows):
   ```
   /crawl4ai-setup-agents
   ```

4. **Crawl**:
   ```
   Crawl https://example.com and give me the markdown.
   ```

## Usage

### Direct tool usage

The `crawl4ai` tool is available to the LLM in any pi session. Just ask:

```
Crawl https://example.com and give me the markdown.
Crawl https://docs.example.com deeply using BFS, max 10 pages.
Extract all product names and prices from https://shop.example.com as JSON.
```

### Prompt templates

Three prompt templates are available:

```
/crawl4ai https://example.com                       # general — scrape, crawl, or extract
/crawl4ai-scrape https://example.com                 # single page → clean markdown
/crawl4ai-extract https://example.com product prices # single page → structured JSON
```

### Subagent workflows

After running `/crawl4ai-setup-agents`, three agents become available for the [subagent tool](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent):

**Single agent:**
```
Use crawl4ai-scrape to get the content of https://example.com
Use crawl4ai-crawl to explore https://docs.example.com with max 10 pages
Use crawl4ai-extract to get all product prices from https://shop.example.com
```

**Parallel execution:**
```
Run 3 crawl4ai-scrape agents in parallel: one for https://example.com, one for https://docs.example.com, one for https://blog.example.com
```

**Chained workflow:**
```
Use a chain: first have crawl4ai-scrape get the page at https://shop.example.com, then have crawl4ai-extract pull structured product data from {previous}
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
| `/crawl4ai-setup-agents` | Symlink agents to `~/.pi/agent/agents/` for use with subagent/run |

## Agents

Three specialized agents are included for use with the subagent tool:

| Agent | Purpose | Model |
|-------|---------|-------|
| `crawl4ai-scrape` | Scrape a single page, extract clean markdown | Sonnet |
| `crawl4ai-crawl` | Crawl multiple linked pages (BFS/DFS/best-first) | Sonnet |
| `crawl4ai-extract` | Extract structured data as JSON (LLM or CSS/XPath) | Sonnet |

To set up agents, run inside pi:

```
/crawl4ai-setup-agents
```

This symlinks the agent definitions to `~/.pi/agent/agents/`. After setup, you can use them with the subagent tool:

```
Use crawl4ai-scrape to get the content of https://example.com
Use crawl4ai-crawl to explore https://docs.example.com with max 10 pages
Use crawl4ai-extract to get all product prices from https://shop.example.com
```

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

## Links

- **npm**: https://www.npmjs.com/package/pi-crawl4ai
- **GitHub**: https://github.com/romek-rozen/pi-crawl4ai

## License

MIT — see [LICENSE](./LICENSE)
