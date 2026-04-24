# AGENTS.md — crawl4ai extension

This directory contains the pi extension for Crawl4AI. Work here carefully: this is not a standalone application, just a plugin loaded by pi.

## Purpose

- crawl4ai = a web crawling tool for pi
- Crawl4AI cache should be project-scoped: `./.crawl4ai/`
- full crawl results are saved to `./.crawl4ai/outputs/<domain>/<format>/`
- inline responses show only the file path; use `read` if the content is needed

## Key rules

1. **Do not write outputs into the plugin code.**
   - code in `/.pi/extensions/crawl4ai/`
   - working data and results in `/.crawl4ai/`
2. **Cache and outputs are separate.**
   - cache/robots/db → `./.crawl4ai/`
   - full crawl output → `./.crawl4ai/outputs/`
3. **Do not show full results inline.**
   - the agent should receive only the path
   - if it wants the content, it should use `read`
4. **`output_format=json` requires extraction.**
   - `json_extract` or `schema_path` is required
   - without it, return a readable error instead of running the crawl
5. **`cache_mode` is active by default.**
   - set `cache_mode=enabled`
   - `bypass_cache: true` only when the user explicitly wants it
6. **Maintain compatibility with pi.**
   - edit `tool.ts`, `resolve.ts`, `args.ts` carefully
   - after changes, verify the extension still loads after `/reload`

## Output conventions

Target path for a single crawl:

`./.crawl4ai/outputs/{domain-name}/{format}/{YYYY-MM-DD-HH-mm}-{url-slug}.{ext}`

Example:

`./.crawl4ai/outputs/ibb.media/markdown-fit/2026-04-23-00-15-home.md`

### Normalization

- `www.ibb.media` → `ibb.media`
- URL path and query must be converted to a safe slug
- avoid special characters in file names

## When editing files

- `tool.ts` — main execution logic, input validation, output saving
- `resolve.ts` — paths, slugging, output path helpers
- `args.ts` — parameter-to-CLI-flag mapping
- `commands.ts` — user commands
- `README.md` — always update if you change behavior

## Post-change checklist

- [ ] does `json` without `json_extract/schema_path` return a readable error?
- [ ] does the output get saved to `./.crawl4ai/outputs/`?
- [ ] is `/tmp` no longer the default location for full output?
- [ ] does `resolve.ts` have correct URL path normalization (`/+/g`)?
- [ ] after changes, does pi load the extension without errors after `/reload`?

## Quick validation

If you have access to TypeScript:

```bash
tsc -v
node -e "..."
```

If not, check the syntax via a quick transpile or simply reload pi and run a test crawl.

## Operational note

When you need to change behavior for the user, prefer:
- a short, clear error message
- no guessing
- saving the result to a file instead of flooding the TUI
