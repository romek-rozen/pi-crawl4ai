/**
 * format.ts
 *
 * Post-processing of the crawl result:
 * - truncation to pi limits (50 KB / 2000 lines)
 * - saving the full output to a temporary file when truncation occurred
 * - building the feedback message for the LLM
 */

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	truncateHead,
	withFileMutationQueue,
} from "@mariozechner/pi-coding-agent";

/**
 * Prepares the final text to be shown to the LLM.
 * If the result is too large — truncates it and saves the full version to /tmp.
 *
 * @returns object { text, truncated, fullOutputPath }
 */
export async function formatCrawlOutput(
	stdout: string,
): Promise<{ text: string; truncated: boolean; fullOutputPath?: string }> {
	const truncation = truncateHead(stdout, {
		maxLines: DEFAULT_MAX_LINES,
		maxBytes: DEFAULT_MAX_BYTES,
	});

	let text = truncation.content;
	let truncated = false;
	let fullOutputPath: string | undefined;

	if (truncation.truncated) {
		truncated = true;
		const tempDir = await mkdtemp(join(tmpdir(), "pi-crawl4ai-"));
		fullOutputPath = join(tempDir, "output.txt");
		await withFileMutationQueue(fullOutputPath, async () => {
			await writeFile(fullOutputPath!, stdout, "utf8");
		});

		const truncatedLines = truncation.totalLines - truncation.outputLines;
		const truncatedBytes = truncation.totalBytes - truncation.outputBytes;
		text +=
			`\n\n[crawl4ai] Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines ` +
			`(${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). ` +
			`${truncatedLines} lines (${formatSize(truncatedBytes)}) omitted. ` +
			`Full output saved to: ${fullOutputPath}`;
	}

	return { text, truncated, fullOutputPath };
}
