/**
 * render.ts
 *
 * Własny wygląd tool calli i wyników w TUI pi.
 * Cel: nie zalewać terminala tekstem — pokazywać tylko podgląd + ścieżkę.
 */

import { Text } from "@mariozechner/pi-tui";
import type { CrawlDetails } from "./types.js";

/** Jak wyświetlić wywołanie toola w TUI (przed/po wykonaniu). */
export function renderCrawlCall(args: Record<string, unknown>, theme: any): Text {
	let text = theme.fg("toolTitle", theme.bold("[crawl4ai] "));
	text += theme.fg("accent", String(args.url ?? "???"));
	if (args.deep_crawl) text += theme.fg("dim", ` deep=${args.deep_crawl}`);
	if (args.output_format) text += theme.fg("dim", ` fmt=${args.output_format}`);
	return new Text(text, 0, 0);
}

/** Jak wyświetlić wynik toola w TUI. */
export function renderCrawlResult(
	result: { content: Array<{ type: string; text?: string }>; details?: unknown },
	expanded: boolean,
	isPartial: boolean,
	theme: any,
): Text {
	if (isPartial) {
		return new Text(theme.fg("warning", "[crawl4ai] Crawling…"), 0, 0);
	}

	const details = result.details as CrawlDetails | undefined;
	if (!details) {
		return new Text(theme.fg("dim", "[crawl4ai] No details"), 0, 0);
	}

	// Błąd wykonania
	if (details.exitCode !== 0) {
		return new Text(theme.fg("error", `[crawl4ai] Failed (exit ${details.exitCode})`), 0, 0);
	}

	// Skrócony podgląd — zawsze pokazujemy tylko nagłówek + ścieżkę
	let text = theme.fg("success", "[crawl4ai] Crawl complete");

	const targetPath = details.outputFile ?? details.fullOutputPath;
	if (targetPath) {
		text += `\n${theme.fg("dim", targetPath)}`;
	}

	// W trybie rozwiniętym — max 5 linii podglądu
	if (expanded && result.content[0]?.type === "text") {
		const lines = result.content[0].text!.split("\n");
		// Pomiń linie nagłówkowe ("[crawl4ai] Crawl complete", "--- Preview ---", etc.)
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
