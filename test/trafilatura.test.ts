import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	appendImageReferences,
	appendMarkdownTables,
	parseCrawlDocument,
	parseRawHtml,
	runTrafilatura,
} from "../extensions/crawl4ai/trafilatura.ts";

test("parseRawHtml returns CrawlResult.html", () => {
	assert.equal(parseRawHtml(JSON.stringify({ html: "<html><p>Hello</p></html>" })), "<html><p>Hello</p></html>");
});

test("parseCrawlDocument reads Crawl4AI image source and alt metadata", () => {
	const document = parseCrawlDocument(JSON.stringify({
		html: "<html></html>",
		media: { images: [{ src: "/hero.png", alt: "Hero image" }] },
	}));
	assert.deepEqual(document.images, [{ src: "/hero.png", alt: "Hero image" }]);
});

test("appendImageReferences preserves alt text and resolves relative image URLs", () => {
	assert.equal(
		appendImageReferences(
			"[Download](/hero.png)",
			[
				{ src: "/hero.png", alt: "Hero image" },
				{ src: "/hero.png", alt: "Duplicate metadata" },
			],
			"https://example.com/page",
			"markdown",
		),
		"[Download](/hero.png)\n\n![Hero image](https://example.com/hero.png)",
	);
});

test("appendMarkdownTables replaces Trafilatura's flattened cells", () => {
	const table = "| Plan | Price |\n| --- | --- |\n| Basic | $10 |";
	const flattened = "Content\nPlan\nPrice\nBasic\n$10\nFooter";
	assert.equal(
		appendMarkdownTables(flattened, table, "markdown"),
		`Content\n${table}\nFooter`,
	);
	assert.equal(
		appendMarkdownTables(flattened, table, "text"),
		"Content\nPlan\tPrice\nBasic\t$10\nFooter",
	);
	const existingWithDifferentSpacing = "| Plan  | Price  |\n| --- | --- |\n| Basic  | $10  |";
	assert.equal(
		appendMarkdownTables(existingWithDifferentSpacing, table, "markdown"),
		existingWithDifferentSpacing,
	);
});

test("parseRawHtml rejects invalid JSON and missing HTML", () => {
	assert.throws(() => parseRawHtml("not json"), /valid JSON/);
	assert.throws(() => parseRawHtml(JSON.stringify({ html: "" })), /no raw HTML/);
});

test("parseRawHtml rejects deep-crawl arrays", () => {
	assert.throws(() => parseRawHtml(JSON.stringify([{ html: "<p>Hello</p>" }])), /single page/);
});

function fakeTrafilatura(scriptBody: string): { path: string; cleanup: () => void } {
	const directory = mkdtempSync(join(tmpdir(), "pi-crawl4ai-trafilatura-test-"));
	const path = join(directory, "trafilatura");
	writeFileSync(path, `#!/usr/bin/env node\n${scriptBody}\n`);
	chmodSync(path, 0o755);
	return { path, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

test("runTrafilatura streams HTML and maps Markdown controls to CLI flags", async () => {
	const fake = fakeTrafilatura(`
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => process.stdout.write(JSON.stringify({ args: process.argv.slice(2), input })));
`);
	try {
		const result = await runTrafilatura(fake.path, "<p>Hello</p>", "markdown", true, true, true, false, 5);
		assert.equal(result.exitCode, 0);
		const captured = JSON.parse(result.stdout);
		assert.deepEqual(captured.args, [
			"--output-format", "markdown", "--links", "--formatting", "--images", "--no-tables",
		]);
		assert.equal(captured.input, "<p>Hello</p>");
	} finally {
		fake.cleanup();
	}
});

test("runTrafilatura maps text to txt without rich-output flags", async () => {
	const fake = fakeTrafilatura(`process.stdin.resume(); process.stdin.on("end", () => process.stdout.write(process.argv.slice(2).join(" ")));`);
	try {
		const result = await runTrafilatura(fake.path, "<p>Hello</p>", "text", false, false, false, true, 5);
		assert.equal(result.stdout, "--output-format txt");
	} finally {
		fake.cleanup();
	}
});

test("runTrafilatura rejects a pre-aborted request before spawning", async () => {
	const controller = new AbortController();
	controller.abort();
	await assert.rejects(
		runTrafilatura("/definitely/missing/trafilatura", "<p>Hello</p>", "text", false, false, false, true, 5, controller.signal),
		/aborted/,
	);
});

test("runTrafilatura timeout rejects without leaving the force-kill timer alive", async () => {
	const fake = fakeTrafilatura(`process.on("SIGTERM", () => process.exit(0)); setInterval(() => {}, 1000);`);
	const started = Date.now();
	try {
		await assert.rejects(runTrafilatura(fake.path, "<p>Hello</p>", "text", false, false, false, true, 0.05), /timed out/);
		assert.ok(Date.now() - started < 1000);
	} finally {
		fake.cleanup();
	}
});
