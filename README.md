# pi-crawl4ai

[![npm](https://img.shields.io/npm/v/pi-crawl4ai)](https://www.npmjs.com/package/pi-crawl4ai)
[![GitHub](https://img.shields.io/github/license/romek-rozen/pi-crawl4ai)](https://github.com/romek-rozen/pi-crawl4ai)
[![Built with Crawl4AI](https://img.shields.io/badge/Built%20with-Crawl4AI-blue)](https://github.com/unclecode/crawl4ai)
[![Built for pi](https://img.shields.io/badge/Built%20for-pi-green)](https://github.com/earendil-works/pi)

A production-ready [pi](https://github.com/earendil-works/pi) package that integrates [Crawl4AI](https://github.com/unclecode/crawl4ai) with optional [Trafilatura](https://trafilatura.readthedocs.io/) extraction for compact, token-efficient web content.

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
- `prompts/` — four prompt templates for general crawling, scraping, extraction, and chained scrape/extract
- MIT license

## Quick start

1. **Install Crawl4AI** (inside pi):
   ```
   /crawl4ai-install
   ```
   This creates isolated Python environments and installs both `crawl4ai` and `trafilatura` locally. They are isolated to avoid incompatible `lxml` requirements.

2. **Verify**:
   ```
   /crawl4ai-status
   /crawl4ai-test
   ```
   Status reports both binaries and keeps a compact `crawl4ai: ready + trafilatura`, `crawl4ai: ready`, `missing`, or `error` footer indicator. The test command exercises Crawl4AI → Trafilatura.

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
Crawl https://example.com with Trafilatura and give me compact markdown.
Crawl https://example.com with Trafilatura as plain text to minimize tokens.
Crawl https://docs.example.com deeply using BFS, max 10 pages.
Extract all product names and prices from https://shop.example.com as JSON.
```

### Prompt templates

Four prompt templates are available:

```
/crawl4ai https://example.com                       # general — scrape, crawl, or extract
/crawl4ai-scrape https://example.com                 # single page → clean markdown
/crawl4ai-extract https://example.com product prices # single page → structured JSON
/crawl4ai-scrape-and-extract https://example.com prices # compact scrape → JSON extraction
```

### Subagent workflows

After running `/crawl4ai-setup-agents`, three agents become available for the [subagent tool](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent):

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
| `output_format` | `markdown` (default), `markdown-fit`, `md`, `md-fit`, `json`, `all`; also `text` with Trafilatura |
| `extractor` | Optional `trafilatura` for compact single-page Markdown/text |
| `include_links` | Trafilatura Markdown only: preserve link targets (default `false`) |
| `include_formatting` | Preserve Markdown headings/emphasis (default `true` for Markdown) |
| `include_images` | Include images with `alt` text and resolved source URLs (default `false`) |
| `include_tables` | Preserve tables; set `false` to reduce output (default `true`) |
| `deep_crawl` | `bfs`, `dfs`, or `best-first` (not supported with Trafilatura) |
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
| `/crawl4ai-install` | Create isolated local venvs and install Crawl4AI + Trafilatura |
| `/crawl4ai-test` | Run a smoke test crawl on example.com |
| `/crawl4ai-status` | Show binary path and health check; keep a compact status in the footer |
| `/crawl4ai-clear-cache` | Remove local `.crawl4ai/cache` and `.crawl4ai/robots` |
| `/crawl4ai-setup-agents` | Symlink agents to `~/.pi/agent/agents/` for use with subagent/run |

## Agents

Three specialized agents are included for use with the subagent tool:

| Agent | Purpose |
|-------|---------|
| `crawl4ai-scrape` | Scrape a single page into compact Trafilatura Markdown/text |
| `crawl4ai-crawl` | Crawl multiple linked pages (BFS/DFS/best-first) |
| `crawl4ai-extract` | Extract structured data as JSON (LLM or CSS/XPath) |

Agents inherit the active pi model; they do not hardcode one.

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

## Token-efficient Trafilatura extraction

For reading a single page with less boilerplate, use:

```json
{
  "url": "https://example.com",
  "extractor": "trafilatura",
  "output_format": "markdown"
}
```

Use `output_format: "text"` for the smallest plain-text result. Markdown formatting and tables are preserved by default because headings, emphasis, and table structure carry context. Links and images remain opt-in because they increase output size. Trafilatura mode:

- fetches the page through Crawl4AI;
- processes Crawl4AI's raw HTML locally, without an LLM;
- saves extracted content to `.crawl4ai/outputs/<domain>/trafilatura/*.md` or `*.txt`;
- preserves the source HTML beside it as `*.raw.html`;
- returns only artifact paths inline;
- supports links, Markdown formatting, tables, and image `alt` text/source URLs;
- supports single pages only and cannot be combined with question/JSON extraction.

### Example: `https://pi.dev/`

Basic Crawl4AI Markdown keeps the broad page representation, including navigation and presentation-oriented content:

```json
{ "url": "https://pi.dev/", "output_format": "markdown" }
```

For a shorter reading artifact while retaining useful structure:

```json
{
  "url": "https://pi.dev/",
  "extractor": "trafilatura",
  "output_format": "markdown",
  "include_links": true,
  "include_formatting": true,
  "include_images": true,
  "include_tables": true
}
```

Observed differences on `pi.dev`:

| Content | Crawl4AI Markdown | Trafilatura example |
|---|---|---|
| Main explanatory text | Preserved | Preserved, with peripheral markup removed |
| Links | Preserved | Preserved because `include_links=true` |
| Formatting | Preserved | Preserved by default, including headings and emphasis |
| Image | Included in Crawl4AI page output | `![Doom running in Pi](https://pi.dev/doom-extension.png)` |
| Raw source | Internal crawl result | Saved beside extraction as `*.raw.html` |

The current `pi.dev` page demonstrates links, formatting, and image-alt preservation but does not contain a content table. On table-bearing pages, tables are enabled by default and verified separately: if Trafilatura flattens their cells, the extension replaces that flattened sequence with the GFM table generated by Crawl4AI.

Trafilatura can prune an image section or flatten table cells. The extension therefore supplements images from Crawl4AI media metadata and table structure from Crawl4AI Markdown. This retains detected image `alt` text/source URLs and GFM tables without returning the rest of the broader Crawl4AI document.

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
| `trafilatura.ts` | Parses Crawl4AI raw HTML and runs Trafilatura via stdin |
| `render.ts` | Custom TUI rendering |
| `commands.ts` | Slash commands (`/crawl4ai-*`) |
| `format.ts` | Legacy truncation helper |

## Development

The extension runs inside pi’s extension loader. After modifying source, reload pi and use `/crawl4ai-status` or `/crawl4ai-test` to verify.

## Troubleshooting

- **"Binary not found"** → the extension automatically checks project-local and `~/.pi/extensions/crawl4ai/.venv` installations; otherwise run `/crawl4ai-install` or set `CRAWL4AI_VENV=/path/to/venv`
- **"Trafilatura is not installed"** → run `/crawl4ai-install` or set `TRAFILATURA_VENV=/path/to/venv`; raw HTML is still preserved when extraction cannot start
- **"No default LLM provider configured"** → configure a provider in Crawl4AI before using `json_extract`
- **"the JSON object must be str, bytes or bytearray, not NoneType"** → usually missing `extraction_config` when using `schema_path`, or the page has no matching content
- **Stale cache** → run `/crawl4ai-clear-cache`
- **Timeouts** → increase `timeout` param for slow sites

## Links

- **npm**: https://www.npmjs.com/package/pi-crawl4ai
- **GitHub**: https://github.com/romek-rozen/pi-crawl4ai

## License

MIT — see [LICENSE](./LICENSE)
