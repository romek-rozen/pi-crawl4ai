/**
 * Unit tests for the PURE path/slug helpers in resolve.ts.
 *
 * Run with: npm test  (Node >= 22: node --experimental-strip-types --test)
 *
 * Only the deterministic, side-effect-free helpers are covered here.
 * findCrwl and getVenvEnv are intentionally NOT tested because they depend
 * on the filesystem/environment.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
	slugifyForFileName,
	normalizeCrawl4AiFormat,
	getCrawl4AiDomainSlug,
	getCrawl4AiUrlSlug,
	getCrawl4AiOutputExtension,
	formatCrawl4AiTimestamp,
	getCrawl4AiOutputPath,
	ensureUniqueCrawl4AiOutputPath,
} from "../extensions/crawl4ai/resolve.ts";

// --- slugifyForFileName -----------------------------------------------------

test("slugifyForFileName: lowercases and hyphenates non-alnum runs", () => {
	assert.equal(slugifyForFileName("Hello World!"), "hello-world");
});

test("slugifyForFileName: strips diacritics", () => {
	assert.equal(slugifyForFileName("Café Über Ñoño"), "cafe-uber-nono");
});

test("slugifyForFileName: trims leading/trailing hyphens", () => {
	assert.equal(slugifyForFileName("  --Foo__Bar--  "), "foo-bar");
});

test("slugifyForFileName: uses default fallback for empty result", () => {
	assert.equal(slugifyForFileName("!!!"), "item");
});

test("slugifyForFileName: uses custom fallback for empty result", () => {
	assert.equal(slugifyForFileName("###", "fallback"), "fallback");
});

// --- normalizeCrawl4AiFormat ------------------------------------------------

test("normalizeCrawl4AiFormat: md and markdown map to 'markdown'", () => {
	assert.equal(normalizeCrawl4AiFormat("md"), "markdown");
	assert.equal(normalizeCrawl4AiFormat("markdown"), "markdown");
	assert.equal(normalizeCrawl4AiFormat("MARKDOWN"), "markdown");
});

test("normalizeCrawl4AiFormat: md-fit and markdown-fit map to 'markdown-fit'", () => {
	assert.equal(normalizeCrawl4AiFormat("md-fit"), "markdown-fit");
	assert.equal(normalizeCrawl4AiFormat("markdown-fit"), "markdown-fit");
});

test("normalizeCrawl4AiFormat: json and all pass through", () => {
	assert.equal(normalizeCrawl4AiFormat("json"), "json");
	assert.equal(normalizeCrawl4AiFormat("all"), "all");
});

test("normalizeCrawl4AiFormat: missing/empty format defaults to 'markdown'", () => {
	assert.equal(normalizeCrawl4AiFormat(), "markdown");
	assert.equal(normalizeCrawl4AiFormat(null), "markdown");
	assert.equal(normalizeCrawl4AiFormat(""), "markdown");
});

test("normalizeCrawl4AiFormat: unknown format is slugified", () => {
	assert.equal(normalizeCrawl4AiFormat("Weird Format!"), "weird-format");
});

// --- getCrawl4AiDomainSlug --------------------------------------------------

test("getCrawl4AiDomainSlug: strips leading www. and preserves dots", () => {
	assert.equal(getCrawl4AiDomainSlug("https://www.example.com/path"), "example.com");
});

test("getCrawl4AiDomainSlug: keeps subdomain dots", () => {
	assert.equal(getCrawl4AiDomainSlug("https://blog.sub.example.co.uk/x"), "blog.sub.example.co.uk");
});

test("getCrawl4AiDomainSlug: invalid URL falls back to a slug", () => {
	assert.equal(getCrawl4AiDomainSlug("not a url"), "not-a-url");
});

// --- getCrawl4AiUrlSlug -----------------------------------------------------

test("getCrawl4AiUrlSlug: path and query become a safe slug", () => {
	assert.equal(getCrawl4AiUrlSlug("https://example.com/foo/bar?x=1&y=2"), "foo-bar-x-1-y-2");
});

test("getCrawl4AiUrlSlug: root path falls back to hostname-based slug", () => {
	// pathname "/" collapses to empty, so the fallback is the hostname.
	assert.equal(getCrawl4AiUrlSlug("https://example.com/"), "example-com");
});

test("getCrawl4AiUrlSlug: invalid URL falls back to a slug", () => {
	assert.equal(getCrawl4AiUrlSlug("not a url"), "not-a-url");
});

// --- getCrawl4AiOutputExtension ---------------------------------------------

test("getCrawl4AiOutputExtension: json -> json", () => {
	assert.equal(getCrawl4AiOutputExtension("json"), "json");
});

test("getCrawl4AiOutputExtension: all -> txt", () => {
	assert.equal(getCrawl4AiOutputExtension("all"), "txt");
});

test("getCrawl4AiOutputExtension: markdown and markdown-fit -> md", () => {
	assert.equal(getCrawl4AiOutputExtension("markdown"), "md");
	assert.equal(getCrawl4AiOutputExtension("md-fit"), "md");
	assert.equal(getCrawl4AiOutputExtension(), "md");
});

// --- formatCrawl4AiTimestamp ------------------------------------------------

test("formatCrawl4AiTimestamp: pads month+1 and produces YYYY-MM-DD-HH-mm", () => {
	// Month is 0-based in the Date input (0 => January); output pads month+1.
	const date = new Date(2026, 0, 2, 3, 4);
	assert.equal(formatCrawl4AiTimestamp(date), "2026-01-02-03-04");
});

// --- getCrawl4AiOutputPath --------------------------------------------------

test("getCrawl4AiOutputPath: assembles domain/format/timestamp/extension", () => {
	const date = new Date(2026, 0, 2, 3, 4);
	const path = getCrawl4AiOutputPath("/tmp/proj", "https://www.example.com/foo", "json", date);

	assert.match(path, /\/outputs\/example\.com\/json\//);
	assert.match(path, /2026-01-02-03-04/);
	assert.ok(path.endsWith("2026-01-02-03-04-foo.json"), `unexpected tail: ${path}`);
});

test("getCrawl4AiOutputPath: markdown format uses the .md extension", () => {
	const date = new Date(2026, 0, 2, 3, 4);
	const path = getCrawl4AiOutputPath("/tmp/proj", "https://example.com/page", "markdown", date);

	assert.match(path, /\/outputs\/example\.com\/markdown\//);
	assert.ok(path.endsWith(".md"), `expected .md extension: ${path}`);
});

// --- ensureUniqueCrawl4AiOutputPath -----------------------------------------

test("ensureUniqueCrawl4AiOutputPath: returns the same path when it does not exist", () => {
	const missing = "/tmp/this-path-should-not-exist-9c3f2a/outputs/example.com/markdown/2026-01-02-03-04-foo.md";
	assert.equal(ensureUniqueCrawl4AiOutputPath(missing), missing);
});
