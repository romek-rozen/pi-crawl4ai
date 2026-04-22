# pi-crawl4ai

A shareable [pi](https://github.com/mariozechner/pi) extension that integrates [Crawl4AI](https://github.com/unclecode/crawl4ai) as a custom tool.

## What is included

- `.pi/extensions/crawl4ai/` — the extension source
- `.pi/agents/crawler.md` — a dedicated crawler agent prompt
- MIT license

## Quick start

1. Clone this repo into a pi workspace, or copy the `.pi/` folder into your existing workspace.
2. Start pi and run:
   - `/crawl4ai-install`
   - `/crawl4ai-test`
   - `/crawl4ai-status`
3. Use the tool in chat:
   - “Crawl https://example.com and give me the markdown.”

## Notes

- The extension stores Crawl4AI cache and outputs in the project-local `./.crawl4ai/` directory.
- Full crawl results are written to `./.crawl4ai/outputs/<domain>/<format>/...`.
- `output_format=json` requires `json_extract` or `schema_path`.
- If you want to test the crawler against another workspace, copy the `.pi/extensions/crawl4ai/` folder and the `.pi/agents/crawler.md` agent prompt there.

## Development

The extension is implemented in TypeScript and is designed to run inside pi’s extension loader.
If you modify the source, reload pi and use `/crawl4ai-status` or `/crawl4ai-test` to verify it still works.
