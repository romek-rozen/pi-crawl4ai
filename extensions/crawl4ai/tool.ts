/**
 * tool.ts
 *
 * Definicja custom toola `crawl4ai` widocznego dla LLM.
 *
 * UX decision: output jest zapisywany do katalogu projektu:
 *   ./.crawl4ai/outputs/<domain>/<format>/<timestamp>-<slug>.<ext>
 * LLM / użytkownik dostaje tylko ścieżkę do pełnego pliku.
 * Jeśli agent chce zobaczyć treść, ma użyć `read` na wskazanym pliku.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import { CrawlParams, type CrawlDetails, type CrawlParamsType } from "./types.js";
import { buildArgs } from "./args.js";
import { runCrawl } from "./runner.js";
import {
	ensureUniqueCrawl4AiOutputPath,
	getCrawl4AiOutputPath,
} from "./resolve.js";
import { renderCrawlCall, renderCrawlResult } from "./render.js";

/** Metadane toola — używane w `pi.registerTool()`. */
export const crawlToolMeta = {
	name: "crawl4ai" as const,
	label: "Crawl4AI" as const,
	description:
		"[crawl4ai] Crawl a website and extract clean Markdown/JSON. " +
		"Full output is saved to ./.crawl4ai/outputs/; inline response only points to the file path.",
	promptSnippet:
		"crawl4ai — Crawl a URL and extract clean markdown, JSON, or structured data.",
	promptGuidelines: [
		"Use crawl4ai when the user wants to scrape, crawl, or extract content from a live website.",
		"Full output is saved to disk in ./.crawl4ai/outputs/<domain>/<format>/.",
		"Prefer markdown output for reading content; use json_extract or schema_path for structured data extraction.",
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

/** Główna funkcja wykonawcza toola. */
function validateCrawlRequest(params: CrawlParamsType): string | null {
	if (params.output_format === "json") {
		const hasLlmExtraction = Boolean(params.json_extract?.trim());
		const hasSchemaExtraction = Boolean(params.schema_path?.trim() && params.extraction_config?.trim());
		if (!hasLlmExtraction && !hasSchemaExtraction) {
			return (
				"output_format=json requires an extraction strategy. " +
				"Use json_extract (LLM) or schema_path + extraction_config (CSS/XPath). " +
				"Example extraction_config YAML:\n" +
				"type: json-css\nparams:\n  verbose: true"
			);
		}
		if (params.deep_crawl) {
			return (
				"output_format=json with deep_crawl is not supported by Crawl4AI. " +
				"Use markdown output for deep crawls, or crawl a single page with JSON extraction."
			);
		}
	}
	return null;
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

	// ── Wykonanie crawl przez subprocess ──
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

	// ── Budowa metadanych ──
	const details: CrawlDetails = {
		url: params.url,
		command: crwlPath,
		args,
		exitCode: result.exitCode,
		stderr: result.stderr || undefined,
		stdoutPreview: result.stdout?.slice(0, 500) || undefined,
	};

	// Niezerowy exit code
	if (result.exitCode !== 0) {
		const msg = formatErrorOutput(result);
		return { content: [{ type: "text", text: msg }], details, isError: true };
	}

	// Pusty wynik
	if (!result.stdout.trim()) {
		return {
			content: [{ type: "text", text: "[crawl4ai] Crawl succeeded but returned no content." }],
			details,
		};
	}

	// ── Zapis do katalogu projektu ──
	const { path } = await saveToProjectOutput(
		_ctx.cwd,
		params.url,
		result.stdout,
		params.output_format,
		params.output_file,
	);
	details.fullOutputPath = path;

	const contentText =
		`[crawl4ai] Crawl complete — ${result.stdout.split("\n").length} lines.\n\n` +
		`[crawl4ai] Full output saved to: ${path}\n` +
		`[crawl4ai] Use the read tool if you want to inspect the file.`;

	return {
		content: [{ type: "text", text: contentText }],
		details: { ...details, outputFile: params.output_file },
	};
}

/** Eksport rendererów TUI (używane w `pi.registerTool()`). */
export { renderCrawlCall as renderCall, renderCrawlResult as renderResult };
