# TODO

## High priority

- [ ] Test agents end-to-end with subagent extension (`crawl4ai-scrape`, `crawl4ai-crawl`, `crawl4ai-extract`)
- [ ] Verify `import.meta.url` works in jiti for `/crawl4ai-setup-agents` command
- [ ] Bump to 0.1.1 and publish with agent changes

## Medium priority

- [ ] Run `npm pkg fix` to normalize `repository.url` warning
- [ ] Add `prepublishOnly` script to package.json (version check, lint, etc.)
- [ ] Add workflow prompt templates (e.g. `/scrape-and-extract` chain)

## Low priority

- [ ] Add tests for `resolve.ts` path helpers
- [ ] Add tests for `args.ts` CLI flag mapping
