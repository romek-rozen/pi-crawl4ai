/**
 * Regression tests for validateCrawlRequest.
 *
 * Run with: npm test  (Node >= 22: node --experimental-strip-types --test)
 *
 * Covers GitHub issue #1 — "JSON output fails for deep crawl (NoneType error)":
 * the extension must reject output_format=json + deep_crawl with a clear message
 * BEFORE spawning the crawler, instead of surfacing an opaque exit code 1.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { validateCrawlRequest } from "../extensions/crawl4ai/validate.ts";

// The validator only reads a few fields; cast plain objects to the param type.
const params = (p: Record<string, unknown>) => p as any;

test("issue #1: json + deep_crawl is rejected with a clear 'not supported' message", () => {
	const err = validateCrawlRequest(params({ url: "https://example.com", output_format: "json", deep_crawl: "bfs" }));
	assert.ok(err, "expected a validation error");
	assert.match(err!, /deep_crawl is not supported/);
});

test("issue #1: json + deep_crawl reports the deep-crawl reason even without an extraction strategy", () => {
	// Previously this returned the misleading 'requires an extraction strategy' message.
	const err = validateCrawlRequest(params({ url: "https://example.com", output_format: "json", deep_crawl: "bfs" }));
	assert.match(err!, /deep_crawl is not supported/);
	assert.doesNotMatch(err!, /requires an extraction strategy/);
});

test("json without any extraction strategy is rejected", () => {
	const err = validateCrawlRequest(params({ url: "https://example.com", output_format: "json" }));
	assert.match(err!, /requires an extraction strategy/);
});

test("json with LLM extraction (single page) is valid", () => {
	const err = validateCrawlRequest(
		params({ url: "https://example.com", output_format: "json", json_extract: "Extract prices" }),
	);
	assert.equal(err, null);
});

test("json with CSS/XPath schema extraction (single page) is valid", () => {
	const err = validateCrawlRequest(
		params({
			url: "https://example.com",
			output_format: "json",
			schema_path: "schema.json",
			extraction_config: "cfg.yml",
		}),
	);
	assert.equal(err, null);
});

test("markdown deep crawl is valid", () => {
	const err = validateCrawlRequest(
		params({ url: "https://example.com", output_format: "markdown", deep_crawl: "bfs", max_pages: 10 }),
	);
	assert.equal(err, null);
});

test("default (no output_format) is valid", () => {
	const err = validateCrawlRequest(params({ url: "https://example.com" }));
	assert.equal(err, null);
});

test("Trafilatura accepts single-page Markdown and text", () => {
	assert.equal(validateCrawlRequest(params({ url: "https://example.com", extractor: "trafilatura" })), null);
	assert.equal(
		validateCrawlRequest(params({ url: "https://example.com", extractor: "trafilatura", output_format: "text" })),
		null,
	);
});

test("Trafilatura rejects deep crawl and structured extraction", () => {
	assert.match(
		validateCrawlRequest(params({ url: "https://example.com", extractor: "trafilatura", deep_crawl: "bfs" }))!,
		/single page/,
	);
	assert.match(
		validateCrawlRequest(params({ url: "https://example.com", extractor: "trafilatura", json_extract: "prices" }))!,
		/cannot be combined/,
	);
});

test("text and Trafilatura options require the Trafilatura extractor", () => {
	assert.match(validateCrawlRequest(params({ url: "https://example.com", output_format: "text" }))!, /requires/);
	assert.match(validateCrawlRequest(params({ url: "https://example.com", include_links: true }))!, /require/);
	assert.match(validateCrawlRequest(params({ url: "https://example.com", include_images: true }))!, /require/);
	assert.match(validateCrawlRequest(params({ url: "https://example.com", include_tables: false }))!, /require/);
});

test("BM25 validates query, threshold, format, and incompatible modes", () => {
	assert.equal(validateCrawlRequest(params({ url: "https://example.com", bm25_query: "extension API" })), null);
	assert.equal(validateCrawlRequest(params({ url: "https://example.com", extractor: "trafilatura", output_format: "text", bm25_query: "API" })), null);
	assert.match(validateCrawlRequest(params({ url: "https://example.com", bm25_threshold: 1 }))!, /requires/);
	assert.match(validateCrawlRequest(params({ url: "https://example.com", bm25_query: " " }))!, /must not be empty/);
	assert.match(validateCrawlRequest(params({ url: "https://example.com", bm25_query: "API", bm25_threshold: -1 }))!, /greater than or equal/);
	assert.match(validateCrawlRequest(params({ url: "https://example.com", bm25_query: "API", output_format: "json" }))!, /Markdown/);
	assert.match(validateCrawlRequest(params({ url: "https://example.com", bm25_query: "API", deep_crawl: "bfs" }))!, /single page/);
});

test("Trafilatura link/formatting options require Markdown output", () => {
	assert.match(
		validateCrawlRequest(params({
			url: "https://example.com",
			extractor: "trafilatura",
			output_format: "text",
			include_links: true,
		}))!,
		/Markdown/,
	);
});
