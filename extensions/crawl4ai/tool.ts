/**
 * tool.ts
 *
 * Definition of the custom `crawl4ai` tool visible to the LLM.
 *
 * UX decision: output is saved to the project directory:
 *   ./.crawl4ai/outputs/<domain>/<format>/<timestamp>-<slug>.<ext>
 * The LLM / user only receives the path to the full file.
 * If the agent wants to inspect the content, it should use `read` on the given file.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import { CrawlParams, type CrawlDetails, type CrawlParamsType } from "./types.js";
import { validateCrawlRequest } from "./validate.js";
import { buildArgs } from "./args.js";
import { runCrawl } from "./runner.js";
import {
	ensureUniqueCrawl4AiOutputPath,
	ensureUniqueTrafilaturaOutputPaths,
	findTrafilatura,
	getCrawl4AiOutputPath,
	getRawHtmlSiblingPath,
	getTrafilaturaOutputPaths,
} from "./resolve.js";
import {
	appendImageReferences,
	appendMarkdownTables,
	parseCrawlDocument,
	runTrafilatura,
} from "./trafilatura.js";
import { renderCrawlCall, renderCrawlResult } from "./render.js";
import { filterWithBm25 } from "./bm25.js";

/** Tool metadata — used in `pi.registerTool()`. */
export const crawlToolMeta = {
	name: "crawl4ai" as const,
	label: "Crawl4AI" as const,
	description:
		"[crawl4ai] Crawl a website and extract clean Markdown/text/JSON, optionally with Trafilatura. " +
		"Full output is saved to ./.crawl4ai/outputs/; inline response only points to file paths.",
	promptSnippet:
		"crawl4ai — Crawl a URL and extract compact markdown/text with Trafilatura, or use Crawl4AI JSON extraction.",
	promptGuidelines: [
		"Use crawl4ai when the user wants to scrape, crawl, or extract content from a live website.",
		"Full output is saved to disk in ./.crawl4ai/outputs/<domain>/<format>/.",
		"Prefer extractor=trafilatura with markdown or text for token-efficient single-page reading.",
		"Trafilatura preserves both raw HTML and extracted output under the trafilatura folder.",
		"Trafilatura preserves Markdown formatting and tables by default to retain document structure.",
		"Use include_links/include_images when useful; set include_tables=false only when tables are unnecessary.",
		"Use bm25_query (and optionally bm25_threshold) for query-focused Markdown/text artifacts.",
		"Use json_extract or schema_path for structured data extraction.",
		"json output requires extraction: use json_extract (LLM) or schema_path + extraction_config (CSS/XPath).",
		"Do not use output_format=json without an extraction strategy; return a clear error instead.",
		"Set deep_crawl + max_pages for crawling multiple linked pages (markdown/all only).",
		"Set output_file to save to a specific path instead of the default project output location.",
	],
	parameters: CrawlParams,
};

async function saveToProjectOutput(
	cwd: string,
	url: string,
	stdout: string,
	outputFormat?: string,
	outputFile?: string,
): Promise<{ path: string }> {
	const targetPath = outputFile
		? outputFile
		: ensureUniqueCrawl4AiOutputPath(getCrawl4AiOutputPath(cwd, url, outputFormat));

	await mkdir(dirname(targetPath), { recursive: true });
	await withFileMutationQueue(targetPath, async () => {
		await writeFile(targetPath, stdout, "utf8");
	});

	return { path: targetPath };
}

function formatErrorOutput(result: { stdout: string; stderr: string; exitCode: number | null }): string {
	let msg = `[crawl4ai] Exited with code ${result.exitCode}.`;

	const stderr = result.stderr?.trim();
	const stdout = result.stdout?.trim();

	if (stderr) {
		msg += `\n\nSTDERR:\n${stderr}`;
	}
	if (stdout) {
		const preview = stdout.length > 2000 ? stdout.slice(0, 2000) + "\n… (truncated)" : stdout;
		msg += `\n\nSTDOUT:\n${preview}`;
	}
	if (!stderr && !stdout) {
		msg += "\n\nNo output captured.";
	}

	// Detect known Crawl4AI issues and add hints
	if (stdout?.includes("No default LLM provider configured")) {
		msg +=
			"\n\nHint: JSON/LLM extraction requires a configured LLM provider in Crawl4AI. " +
			"Run `crwl` interactively once to set it up, or create ~/.crawl4ai/global.yml. " +
			"See https://docs.crawl4ai.com for provider setup.";
	}
	if (stdout?.includes("the JSON object must be str, bytes or bytearray, not NoneType")) {
		msg +=
			"\n\nHint: Crawl4AI failed to produce JSON output. " +
			"This usually means extraction config is missing or the page has no matching content. " +
			"For schema_path, make sure you also pass extraction_config (e.g. a YAML with type: json-css).";
	}

	return msg;
}

export async function executeCrawl(
	params: CrawlParamsType,
	signal: AbortSignal | undefined,
	onUpdate: ((update: { content: Array<{ type: "text"; text: string }> }) => void) | undefined,
	_ctx: ExtensionContext,
	crwlPath: string,
): Promise<{
	content: Array<{ type: "text"; text: string }>;
	details: CrawlDetails | { installed: boolean };
	isError?: boolean;
}> {
	const validationError = validateCrawlRequest(params);
	if (validationError) {
		return {
			content: [{ type: "text", text: `[crawl4ai] ${validationError}` }],
			details: { url: params.url, error: validationError } as any,
			isError: true,
		};
	}

	const args = buildArgs(params);
	const timeoutSec = params.timeout ?? 60;

	onUpdate?.({
		content: [{ type: "text", text: `[crawl4ai] Starting crawl of ${params.url} …` }],
	});

	// ── Execute crawl via subprocess ──
	let result: { stdout: string; stderr: string; exitCode: number | null };
	try {
		result = await runCrawl(crwlPath, args, timeoutSec, signal, onUpdate, _ctx.cwd);
	} catch (err: any) {
		return {
			content: [{ type: "text", text: `[crawl4ai] Crawl failed: ${err.message}` }],
			details: { url: params.url, error: err.message } as any,
			isError: true,
		};
	}

	// ── Build metadata ──
	const details: CrawlDetails = {
		url: params.url,
		command: crwlPath,
		args,
		exitCode: result.exitCode,
		stderr: result.stderr || undefined,
		stdoutPreview: result.stdout?.slice(0, 500) || undefined,
	};

	// Non-zero exit code
	if (result.exitCode !== 0) {
		const msg = formatErrorOutput(result);
		return { content: [{ type: "text", text: msg }], details, isError: true };
	}

	// For regular non-question output_file requests, Crawl4AI wrote the artifact
	// directly and intentionally left stdout empty.
	if (params.output_file && params.extractor !== "trafilatura" && !params.question && !params.bm25_query) {
		details.fullOutputPath = params.output_file;
		return {
			content: [{
				type: "text",
				text:
					"[crawl4ai] Crawl complete.\n\n" +
					`[crawl4ai] Full output saved to: ${params.output_file}\n` +
					"[crawl4ai] Use the read tool if you want to inspect the file.",
			}],
			details: { ...details, outputFile: params.output_file },
		};
	}

	// Empty result
	if (!result.stdout.trim()) {
		return {
			content: [{ type: "text", text: "[crawl4ai] Crawl succeeded but returned no content." }],
			details,
		};
	}

	// ── Optional Trafilatura extraction ──
	if (params.extractor === "trafilatura") {
		let rawHtml: string;
		let images: Array<{ src: string; alt: string }>;
		let crawlMarkdown: string;
		try {
			const document = parseCrawlDocument(result.stdout);
			rawHtml = document.html;
			images = document.images;
			crawlMarkdown = document.crawlMarkdown;
		} catch (error: any) {
			return {
				content: [{ type: "text", text: `[crawl4ai] ${error.message}` }],
				details: { ...details, extractor: "trafilatura" },
				isError: true,
			};
		}

		const format = params.output_format === "text" ? "text" : "markdown";
		const defaultPaths = getTrafilaturaOutputPaths(_ctx.cwd, params.url, format);
		let extractedPath: string;
		let rawHtmlPath: string;
		if (params.output_file) {
			extractedPath = params.output_file;
			rawHtmlPath = getRawHtmlSiblingPath(extractedPath);
			await mkdir(dirname(rawHtmlPath), { recursive: true });
			await withFileMutationQueue(rawHtmlPath, async () => {
				await writeFile(rawHtmlPath, rawHtml, "utf8");
			});
		} else {
			// Allocate and write the raw artifact under one directory-scoped queue.
			// The raw file reserves the shared stem before another crawl can choose it.
			const allocated = await withFileMutationQueue(
				join(dirname(defaultPaths.extractedPath), ".trafilatura-output-allocation"),
				async () => {
					const paths = ensureUniqueTrafilaturaOutputPaths(defaultPaths);
					await mkdir(dirname(paths.rawHtmlPath), { recursive: true });
					await writeFile(paths.rawHtmlPath, rawHtml, "utf8");
					return paths;
				},
			);
			extractedPath = allocated.extractedPath;
			rawHtmlPath = allocated.rawHtmlPath;
		}
		details.rawHtmlPath = rawHtmlPath;
		details.extractor = "trafilatura";

		const trafilaturaPath = findTrafilatura(_ctx.cwd, crwlPath);
		if (!trafilaturaPath) {
			return {
				content: [{
					type: "text",
					text:
						"[crawl4ai] Trafilatura is not installed. Run /crawl4ai-install.\n" +
						`[crawl4ai] Raw HTML was preserved at: ${rawHtmlPath}`,
				}],
				details,
				isError: true,
			};
		}

		let extracted;
		try {
			extracted = await runTrafilatura(
				trafilaturaPath,
				rawHtml,
				format,
				params.include_links ?? false,
				params.include_formatting ?? (format === "markdown"),
				params.include_images ?? false,
				params.include_tables ?? true,
				timeoutSec,
				signal,
			);
		} catch (error: any) {
			return {
				content: [{
					type: "text",
					text: `[crawl4ai] Trafilatura failed: ${error.message}\nRaw HTML: ${rawHtmlPath}`,
				}],
				details,
				isError: true,
			};
		}

		if (extracted.exitCode !== 0 || !extracted.stdout.trim()) {
			const reason = extracted.exitCode !== 0
				? `exited with code ${extracted.exitCode}`
				: "returned no extractable content";
			const stderr = extracted.stderr.trim();
			return {
				content: [{
					type: "text",
					text:
						`[crawl4ai] Trafilatura ${reason}.` +
						(stderr ? `\n\nSTDERR:\n${stderr.slice(0, 2000)}` : "") +
						`\n\nRaw HTML: ${rawHtmlPath}`,
				}],
				details: { ...details, stderr: extracted.stderr || details.stderr },
				isError: true,
			};
		}

		let extractedOutput = params.include_tables ?? true
			? appendMarkdownTables(extracted.stdout, crawlMarkdown, format)
			: extracted.stdout;
		if (params.include_images) {
			extractedOutput = appendImageReferences(extractedOutput, images, params.url, format);
		}
		let bm25Summary = "";
		if (params.bm25_query?.trim()) {
			const filtered = filterWithBm25(
				extractedOutput,
				params.bm25_query,
				params.bm25_threshold ?? 1,
				format,
			);
			extractedOutput = filtered.content;
			bm25Summary = ` BM25 retained ${filtered.matchedChunks}/${filtered.totalChunks} structural chunks.`;
		}
		await mkdir(dirname(extractedPath), { recursive: true });
		await withFileMutationQueue(extractedPath, async () => {
			await writeFile(extractedPath, extractedOutput, "utf8");
		});
		details.fullOutputPath = extractedPath;

		return {
			content: [{
				type: "text",
				text:
					`[crawl4ai] Crawl + Trafilatura extraction complete — ${extractedOutput ? extractedOutput.split("\n").length : 0} lines.${bm25Summary}\n\n` +
					`[crawl4ai] Extracted output: ${extractedPath}\n` +
					`[crawl4ai] Raw HTML: ${rawHtmlPath}\n` +
					"[crawl4ai] Use the read tool only if you need to inspect a file.",
			}],
			details: { ...details, outputFile: params.output_file },
		};
	}

	// ── Optional BM25 filtering and regular output saving ──
	let output = result.stdout;
	let bm25Summary = "";
	if (params.bm25_query?.trim()) {
		const filtered = filterWithBm25(output, params.bm25_query, params.bm25_threshold ?? 1, "markdown");
		output = filtered.content;
		bm25Summary = ` BM25 retained ${filtered.matchedChunks}/${filtered.totalChunks} structural chunks.`;
	}
	const { path } = await saveToProjectOutput(
		_ctx.cwd,
		params.url,
		output,
		params.output_format,
		params.output_file,
	);
	details.fullOutputPath = path;

	const contentText =
		`[crawl4ai] Crawl complete — ${output ? output.split("\n").length : 0} lines.${bm25Summary}\n\n` +
		`[crawl4ai] Full output saved to: ${path}\n` +
		`[crawl4ai] Use the read tool if you want to inspect the file.`;

	return {
		content: [{ type: "text", text: contentText }],
		details: { ...details, outputFile: params.output_file },
	};
}

/** Export of TUI renderers (used in `pi.registerTool()`). */
export { renderCrawlCall as renderCall, renderCrawlResult as renderResult };
