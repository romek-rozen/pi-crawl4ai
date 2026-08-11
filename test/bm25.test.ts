import { test } from "node:test";
import assert from "node:assert/strict";

import { filterWithBm25, splitStructuralChunks } from "../extensions/crawl4ai/bm25.ts";

const markdown = [
	"# Installation",
	"Install the extension with npm. See [the guide](https://example.com/install).",
	"![Installer screenshot](https://example.com/install.png)",
	"## Pricing",
	"Our enterprise pricing is available on request.",
	"| Plan | Price |\n| --- | --- |\n| Free | $0 |",
].join("\n\n");

test("structural chunks keep headings, links, images, and tables intact", () => {
	const chunks = splitStructuralChunks(markdown, "markdown");
	assert.equal(chunks.length, 2);
	assert.match(chunks[0], /^# Installation/);
	assert.match(chunks[0], /\[the guide\]\(https:\/\/example.com\/install\)/);
	assert.match(chunks[0], /!\[Installer screenshot\]/);
	assert.match(chunks[1], /\| Plan \| Price \|/);
});

test("BM25 deterministically retains query-relevant sections", () => {
	const first = filterWithBm25(markdown, "installation extension", 0.5);
	const second = filterWithBm25(markdown, "installation extension", 0.5);
	assert.deepEqual(first, second);
	assert.equal(first.matchedChunks, 1);
	assert.match(first.content, /# Installation/);
	assert.doesNotMatch(first.content, /## Pricing/);
});

test("BM25 threshold can produce an empty artifact", () => {
	const result = filterWithBm25(markdown, "installation", 100);
	assert.equal(result.content, "");
	assert.equal(result.matchedChunks, 0);
	assert.equal(result.totalChunks, 2);
});

test("plain text paragraphs are ranked without changing selected text", () => {
	const content = "Install the API extension.\n\nRead about unrelated recipes.";
	assert.equal(filterWithBm25(content, "API extension", 0.5, "text").content, "Install the API extension.");
});
