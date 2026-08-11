/**
 * render.ts
 *
 * Custom appearance of tool calls and results in the pi TUI.
 * Goal: avoid flooding the terminal with text — show only a preview + path.
 */

import { Text } from "@earendil-works/pi-tui";
import type { CrawlDetails } from "./types.js";

/** How to display a tool call in the TUI (before/after execution). */
export function renderCrawlCall(args: Record<string, unknown>, theme: any): Text {
	let text = theme.fg("toolTitle", theme.bold("[crawl4ai] "));
	text += theme.fg("accent", String(args.url ?? "???"));
	if (args.deep_crawl) text += theme.fg("dim", ` deep=${args.deep_crawl}`);
	if (args.output_format) text += theme.fg("dim", ` fmt=${args.output_format}`);
	if (args.extractor) text += theme.fg("dim", ` extractor=${args.extractor}`);
	return new Text(text, 0, 0);
}

/** How to display a tool result in the TUI. */
export function renderCrawlResult(
	result: { content: Array<{ type: string; text?: string }>; details?: unknown; isError?: boolean },
	options: { expanded: boolean; isPartial: boolean },
	theme: any,
	_context?: any,
): Text {
	if (options.isPartial) {
		return new Text(theme.fg("warning", "[crawl4ai] Crawling…"), 0, 0);
	}

	const details = result.details as CrawlDetails | undefined;
	if (!details) {
		return new Text(theme.fg("dim", "[crawl4ai] No details"), 0, 0);
	}

	// Crawl or post-processing error
	if (result.isError || details.exitCode !== 0 || details.error) {
		const suffix = details.exitCode !== 0 ? ` (exit ${details.exitCode})` : "";
		return new Text(theme.fg("error", `[crawl4ai] Failed${suffix}`), 0, 0);
	}

	// Compact preview — always show only the header + path
	let text = theme.fg("success", "[crawl4ai] Crawl complete");

	const targetPath = details.outputFile ?? details.fullOutputPath;
	if (targetPath) {
		text += `\n${theme.fg("dim", targetPath)}`;
	}
	if (details.rawHtmlPath) {
		text += `\n${theme.fg("muted", `raw: ${details.rawHtmlPath}`)}`;
	}

	// In expanded mode — max 5 preview lines
	if (options.expanded && result.content[0]?.type === "text") {
		const lines = result.content[0].text!.split("\n");
		// Skip header lines ("[crawl4ai] Crawl complete", "--- Preview ---", etc.)
		const previewStart = lines.findIndex((l) => l.startsWith("--- Preview"));
		if (previewStart >= 0) {
			const previewLines = lines.slice(previewStart + 1, previewStart + 6);
			for (const line of previewLines) {
				if (line.startsWith("--- Full output") || line.startsWith("… (")) break;
				text += `\n${theme.fg("dim", line)}`;
			}
			if (lines.some((l) => l.includes("more lines"))) {
				text += `\n${theme.fg("muted", "… (use read tool to see full output)")}`;
			}
		}
	}

	return new Text(text, 0, 0);
}
