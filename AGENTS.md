# AGENTS.md — pi-crawl4ai

This repository contains a pi package for Crawl4AI. Work carefully: this is not a standalone app, but a plugin loaded by pi.

## Purpose

- `crawl4ai` = web crawling tool for pi
- Crawl4AI cache is project-local: `./.crawl4ai/`
- Full crawl outputs are saved to `./.crawl4ai/outputs/<domain>/<format>/`
- Inline response shows only the file path; use `read` to inspect content

## Key Rules

1. **Do NOT save outputs inside the extension code.**
   - Code lives in `/extensions/crawl4ai/`
   - Working data and results go in `/.crawl4ai/`
2. **Cache and outputs are separate.**
   - cache/robots/db → `./.crawl4ai/`
   - full crawl output → `./.crawl4ai/outputs/`
3. **Do NOT show full results inline.**
   - Agent gets only the path
   - If they want content, they use `read`
4. **`output_format=json` requires extraction.**
   - Needs `json_extract` (LLM) OR `schema_path` + `extraction_config` (CSS/XPath)
   - Without it, return a clear error instead of running crawl
5. **`cache_mode` is active by default.**
   - We set `cache_mode=enabled`
   - `bypass_cache: true` only when user asks for it
6. **Keep compatibility with pi.**
   - Edit `tool.ts`, `resolve.ts`, `args.ts` carefully
   - After changes, check if extension still loads with `/reload`

## Output Conventions

Target path for single crawl:

`./.crawl4ai/outputs/{domain-slug}/{format}/{YYYY-MM-DD-HH-mm}-{url-slug}.{ext}`

Example:

`./.crawl4ai/outputs/ibb.media/markdown-fit/2026-04-23-00-15-home.md`

### Normalization

- `www.ibb.media` → `ibb.media` (dots preserved)
- URL path and query must become a safe slug
- Avoid special characters in filenames

## When Editing Files

- `tool.ts` — main execution logic, input validation, output saving
- `resolve.ts` — paths, slugging, output path helpers
- `args.ts` — parameter mapping to CLI flags
- `commands.ts` — user commands
- `README.md` — always update if behavior changes

## Post-Change Checklist

- [ ] Does `json` without `json_extract/schema_path` return a clear error?
- [ ] Does output save to `./.crawl4ai/outputs/`?
- [ ] Does `resolve.ts` have correct URL path normalization?
- [ ] Does pi load the extension without errors after `/reload`?

## Quick Validation

If you have TypeScript:

```bash
tsc -v
node -e "..."
```

If not, check syntax via quick transpile or simply reload pi and run a test crawl.

## Operational Note

When changing behavior for the user, prefer:
- short, clear error messages
- no guessing
- saving results to file instead of flooding TUI
