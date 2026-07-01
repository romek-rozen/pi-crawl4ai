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
