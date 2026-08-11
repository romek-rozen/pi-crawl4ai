# TODO

## High priority

- [x] Add optional Trafilatura extraction with Markdown/text output and raw HTML preservation
- [x] Test Trafilatura pipeline on rozenberger.com and ibb.media
- [ ] Test agents end-to-end with subagent extension (`crawl4ai-scrape`, `crawl4ai-crawl`, `crawl4ai-extract`) — needs a live `crwl` install + real crawl
- [ ] Verify `import.meta.url` works in jiti for `/crawl4ai-setup-agents` command

## Medium priority

- [x] Run `npm pkg fix` to normalize `repository.url` warning
- [x] Add `prepublishOnly` script to package.json (runs `npm test` before publish)
- [x] Add workflow prompt template `/crawl4ai-scrape-and-extract` (scrape → extract chain)

## Low priority

- [x] Add tests for request validation (`validate.ts`) — covers issue #1
- [x] Add tests for `resolve.ts` path helpers
- [x] Add tests for `args.ts` CLI flag mapping
