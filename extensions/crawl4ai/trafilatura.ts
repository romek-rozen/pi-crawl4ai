/**
 * trafilatura.ts
 *
 * Runs Trafilatura against raw HTML fetched by Crawl4AI.
 */

import { spawn } from "node:child_process";
import { dirname } from "node:path";

export interface TrafilaturaResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

export interface CrawlImage {
	src: string;
	alt: string;
}

export interface CrawlDocument {
	html: string;
	images: CrawlImage[];
	crawlMarkdown: string;
}

/** Extracts raw HTML and image metadata from `crwl crawl -o all` output. */
export function parseCrawlDocument(crawlOutput: string): CrawlDocument {
	let parsed: unknown;
	try {
		parsed = JSON.parse(crawlOutput);
	} catch {
		throw new Error("Crawl4AI did not return valid JSON containing raw HTML.");
	}

	if (Array.isArray(parsed)) {
		throw new Error("Trafilatura extraction currently supports a single page only.");
	}

	const result = parsed as {
		html?: unknown;
		media?: { images?: Array<{ src?: unknown; alt?: unknown }> };
		markdown?: { raw_markdown?: unknown };
	} | null;
	const html = result?.html;
	if (typeof html !== "string" || !html.trim()) {
		throw new Error("Crawl4AI returned no raw HTML for Trafilatura.");
	}
	const images = (result?.media?.images ?? [])
		.filter((image) => typeof image.src === "string" && image.src.trim())
		.map((image) => ({
			src: String(image.src).trim(),
			alt: typeof image.alt === "string" ? image.alt.trim() : "",
		}));
	const crawlMarkdown = typeof result?.markdown?.raw_markdown === "string"
		? result.markdown.raw_markdown
		: "";
	return { html, images, crawlMarkdown };
}

/** Backward-compatible helper for callers that only need HTML. */
export function parseRawHtml(crawlOutput: string): string {
	return parseCrawlDocument(crawlOutput).html;
}

/** Adds image references Trafilatura may omit when it prunes their DOM section. */
export function appendImageReferences(
	content: string,
	images: CrawlImage[],
	pageUrl: string,
	format: "markdown" | "text",
): string {
	const imageTargets = new Set(
		Array.from(content.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g), (match) => match[1]),
	);
	const seenSources = new Set<string>();
	const missing = images.filter((image) => {
		let resolved = image.src;
		try {
			resolved = new URL(image.src, pageUrl).href;
		} catch {
			// Keep the original source when URL resolution is impossible.
		}
		if (seenSources.has(resolved)) return false;
		seenSources.add(resolved);
		return !imageTargets.has(resolved) && !imageTargets.has(image.src);
	});
	if (missing.length === 0) return content;

	const references = missing.map((image) => {
		let source = image.src;
		try {
			source = new URL(image.src, pageUrl).href;
		} catch {
			// Keep the original source when URL resolution is impossible.
		}
		const alt = image.alt || "Image";
		return format === "markdown" ? `![${alt}](${source})` : `Image: ${alt} — ${source}`;
	});
	return `${content.trimEnd()}\n\n${references.join("\n")}`;
}

/** Restores table structure from Crawl4AI Markdown when Trafilatura flattens cells. */
export function appendMarkdownTables(
	content: string,
	crawlMarkdown: string,
	format: "markdown" | "text",
): string {
	const collectTables = (markdown: string): string[] => {
		const lines = markdown.split("\n");
		const tables: string[] = [];
		for (let index = 0; index < lines.length;) {
			if (!lines[index].includes("|")) {
				index += 1;
				continue;
			}
			const block: string[] = [];
			while (index < lines.length && lines[index].includes("|")) {
				block.push(lines[index].trimEnd());
				index += 1;
			}
			const hasSeparator = block.some((line) =>
				/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line),
			);
			if (block.length >= 2 && hasSeparator) tables.push(block.join("\n"));
		}
		return tables;
	};
	const tableRows = (table: string): string[][] => table
		.split("\n")
		.filter((line) => !/^\s*\|?\s*:?-{3,}/.test(line))
		.map((line) =>
			line.replace(/^\s*\||\|\s*$/g, "").split("|").map((cell) => cell.trim()),
		);
	const signature = (table: string): string => tableRows(table)
		.flat()
		.map((cell) => cell.replace(/\s+/g, " "))
		.join("\u001f");

	const tables = collectTables(crawlMarkdown);
	if (tables.length === 0) return content;
	const existingSignatures = new Set(collectTables(content).map(signature));
	let restored = content;
	const append: string[] = [];
	for (const table of tables) {
		if (existingSignatures.has(signature(table))) continue;
		const rows = tableRows(table);
		const flattened = rows.flat().join("\n");
		const rendered = format === "markdown"
			? table
			: rows.map((row) => row.join("\t")).join("\n");
		if (flattened && restored.includes(flattened)) {
			restored = restored.replace(flattened, rendered);
		} else {
			append.push(rendered);
		}
	}
	if (append.length === 0) return restored;
	return `${restored.trimEnd()}\n\n${append.join("\n\n")}`;
}

/**
 * Streams HTML to Trafilatura and collects the extracted Markdown/plain text.
 * The executable is resolved explicitly, so this does not depend on shell PATH.
 */
export function runTrafilatura(
	trafilaturaPath: string,
	html: string,
	format: "markdown" | "text",
	includeLinks: boolean,
	includeFormatting: boolean,
	includeImages: boolean,
	includeTables: boolean,
	timeoutSec: number,
	signal?: AbortSignal,
): Promise<TrafilaturaResult> {
	const args = ["--output-format", format === "text" ? "txt" : "markdown"];
	if (includeLinks) args.push("--links");
	if (includeFormatting) args.push("--formatting");
	if (includeImages) args.push("--images");
	if (!includeTables) args.push("--no-tables");

	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error("Trafilatura extraction aborted by user"));
			return;
		}

		const proc = spawn(trafilaturaPath, args, {
			stdio: ["pipe", "pipe", "pipe"],
			env: {
				...process.env,
				PATH: `${dirname(trafilaturaPath)}${process.env.PATH ? ":" + process.env.PATH : ""}`,
				PYTHONIOENCODING: "utf-8",
				PYTHONUTF8: "1",
			},
		});

		let stdout = "";
		let stderr = "";
		let settled = false;
		let killedByTimeout = false;
		let forceKillId: ReturnType<typeof setTimeout> | undefined;

		const finishError = (error: Error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutId);
			if (forceKillId) clearTimeout(forceKillId);
			reject(error);
		};

		const timeoutId = setTimeout(() => {
			killedByTimeout = true;
			proc.kill("SIGTERM");
			forceKillId = setTimeout(() => proc.kill("SIGKILL"), 5000);
		}, timeoutSec * 1000);

		proc.stdout.on("data", (data: Buffer) => {
			stdout += data.toString("utf-8");
		});
		proc.stderr.on("data", (data: Buffer) => {
			stderr += data.toString("utf-8");
		});
		proc.on("error", (error) => finishError(error));
		proc.stdin.on("error", (error: NodeJS.ErrnoException) => {
			if (error.code !== "EPIPE") finishError(error);
		});
		proc.on("close", (exitCode) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutId);
			if (forceKillId) clearTimeout(forceKillId);
			if (killedByTimeout) {
				reject(new Error(`Trafilatura timed out after ${timeoutSec}s`));
				return;
			}
			resolve({ stdout, stderr, exitCode });
		});

		signal?.addEventListener("abort", () => {
			proc.kill("SIGTERM");
			finishError(new Error("Trafilatura extraction aborted by user"));
		}, { once: true });

		proc.stdin.end(html, "utf8");
	});
}
