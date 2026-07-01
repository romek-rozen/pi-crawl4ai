/**
 * Unit tests for buildArgs — the CLI flag mapping in args.ts.
 *
 * Run with: npm test  (Node >= 22: node --experimental-strip-types --test)
 *
 * buildArgs maps the friendly CrawlParamsType object to raw `crwl crawl` flags.
 * Flag order is arbitrary except: "crawl" is always first and the URL is always last.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildArgs } from "../extensions/crawl4ai/args.ts";

// buildArgs only reads a handful of fields; cast plain objects to the param type.
const p = (o: Record<string, unknown>) => o as any;

/** Returns the element immediately following `flag`, or undefined if absent. */
function valueAfter(args: string[], flag: string): string | undefined {
	const i = args.indexOf(flag);
	return i === -1 ? undefined : args[i + 1];
}

const URL = "https://example.com";

test("crawl is always first and the URL is always last", () => {
	const args = buildArgs(p({ url: URL, output_format: "markdown", output_file: "out.md" }));
	assert.equal(args[0], "crawl");
	assert.equal(args.at(-1), URL);
});

test("minimal params produce exactly [crawl, -c, cache_mode=enabled, url]", () => {
	const args = buildArgs(p({ url: URL }));
	assert.deepEqual(args, ["crawl", "-c", "cache_mode=enabled", URL]);
});

test("output_format maps to -o value", () => {
	const args = buildArgs(p({ url: URL, output_format: "json" }));
	assert.equal(valueAfter(args, "-o"), "json");
});

test("deep_crawl maps to --deep-crawl value", () => {
	const args = buildArgs(p({ url: URL, output_format: "markdown", deep_crawl: "bfs" }));
	assert.equal(valueAfter(args, "--deep-crawl"), "bfs");
});

test("max_pages maps to --max-pages String(value)", () => {
	const args = buildArgs(p({ url: URL, max_pages: 10 }));
	assert.equal(valueAfter(args, "--max-pages"), "10");
});

test("max_pages of 0 is still emitted (undefined check, not falsy)", () => {
	const args = buildArgs(p({ url: URL, max_pages: 0 }));
	assert.equal(valueAfter(args, "--max-pages"), "0");
});

test("question maps to -q value", () => {
	const args = buildArgs(p({ url: URL, question: "What is the price?" }));
	assert.equal(valueAfter(args, "-q"), "What is the price?");
});

test("json_extract maps to -j value", () => {
	const args = buildArgs(p({ url: URL, json_extract: "Extract prices" }));
	assert.equal(valueAfter(args, "-j"), "Extract prices");
});

test("schema_path maps to -s value", () => {
	const args = buildArgs(p({ url: URL, schema_path: "schema.json" }));
	assert.equal(valueAfter(args, "-s"), "schema.json");
});

test("extraction_config maps to -e value", () => {
	const args = buildArgs(p({ url: URL, extraction_config: "cfg.yml" }));
	assert.equal(valueAfter(args, "-e"), "cfg.yml");
});

test("browser_config maps to -b value", () => {
	const args = buildArgs(p({ url: URL, browser_config: "browser.yml" }));
	assert.equal(valueAfter(args, "-b"), "browser.yml");
});

test("output_file maps to -O value", () => {
	const args = buildArgs(p({ url: URL, output_file: "out.md" }));
	assert.equal(valueAfter(args, "-O"), "out.md");
});

test("cache default: forces -c cache_mode=enabled", () => {
	const args = buildArgs(p({ url: URL }));
	assert.equal(valueAfter(args, "-c"), "cache_mode=enabled");
});

test("bypass_cache: emits --bypass-cache and does NOT force cache_mode=enabled", () => {
	const args = buildArgs(p({ url: URL, bypass_cache: true }));
	assert.ok(args.includes("--bypass-cache"), "expected --bypass-cache flag");
	assert.ok(!args.includes("-c"), "did not expect a -c flag when bypassing cache");
	assert.ok(!args.includes("cache_mode=enabled"), "did not expect forced cache_mode=enabled");
});

test("crawler_config without cache_mode= gets ,cache_mode=enabled appended via -c", () => {
	const args = buildArgs(p({ url: URL, crawler_config: "word_count_threshold=5" }));
	assert.equal(valueAfter(args, "-c"), "word_count_threshold=5,cache_mode=enabled");
});

test("crawler_config with cache_mode= already is passed through unchanged", () => {
	const args = buildArgs(p({ url: URL, crawler_config: "cache_mode=bypass,word_count_threshold=5" }));
	assert.equal(valueAfter(args, "-c"), "cache_mode=bypass,word_count_threshold=5");
});

test("bypass_cache takes precedence over crawler_config", () => {
	const args = buildArgs(p({ url: URL, bypass_cache: true, crawler_config: "word_count_threshold=5" }));
	assert.ok(args.includes("--bypass-cache"), "expected --bypass-cache flag");
	assert.ok(!args.includes("-c"), "did not expect a -c flag when bypassing cache");
});

test("all flags together: crawl first, url last, each flag maps correctly", () => {
	const args = buildArgs(
		p({
			url: URL,
			output_format: "json",
			deep_crawl: "bfs",
			max_pages: 25,
			question: "q",
			json_extract: "j",
			schema_path: "s.json",
			extraction_config: "e.yml",
			browser_config: "b.yml",
			crawler_config: "word_count_threshold=3",
			output_file: "o.md",
		}),
	);
	assert.equal(args[0], "crawl");
	assert.equal(args.at(-1), URL);
	assert.equal(valueAfter(args, "-o"), "json");
	assert.equal(valueAfter(args, "--deep-crawl"), "bfs");
	assert.equal(valueAfter(args, "--max-pages"), "25");
	assert.equal(valueAfter(args, "-q"), "q");
	assert.equal(valueAfter(args, "-j"), "j");
	assert.equal(valueAfter(args, "-s"), "s.json");
	assert.equal(valueAfter(args, "-e"), "e.yml");
	assert.equal(valueAfter(args, "-b"), "b.yml");
	assert.equal(valueAfter(args, "-c"), "word_count_threshold=3,cache_mode=enabled");
	assert.equal(valueAfter(args, "-O"), "o.md");
});
