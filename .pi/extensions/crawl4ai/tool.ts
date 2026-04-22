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
		"Prefer markdown output for reading content; use json_extract or schema_path for structured data extraction (requires LLM provider configured in crawl4ai).",
		"Do not use output_format=json without json_extract or schema_path; return a clear error instead.",
		"Set deep_crawl + max_pages for crawling multiple linked pages.",
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
	if (params.output_format !== "json") return null;

	const hasExtraction = Boolean(params.json_extract?.trim() || params.schema_path?.trim());
	if (hasExtraction) return null;

	return (
		"output_format=json requires json_extract or schema_path. " +
		"Use markdown/md-fit if you only want readable page content."
	);
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
	};

	// Niezerowy exit code
	if (result.exitCode !== 0) {
		const msg =
			`[crawl4ai] Exited with code ${result.exitCode}.\n\nSTDERR:\n${result.stderr || "(empty)"}`;
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
