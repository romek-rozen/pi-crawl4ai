/**
 * runner.ts
 *
 * Low-level execution of the `crwl crawl` command via `node:child_process/spawn`.
 * Handles timeout, abort (Ctrl+C), streaming stdout to the UI, and collecting stderr.
 */

import { spawn } from "node:child_process";
import { getVenvEnv } from "./resolve.js";

export interface CrawlResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

/**
 * Runs `crwl crawl <args>` with optional progress streaming to the TUI.
 *
 * @param crwlPath  absolute path to the crwl binary
 * @param args      CLI arguments (excluding "crwl" itself)
 * @param timeoutSec  maximum wait time in seconds
 * @param signal    AbortSignal from pi (e.g. when the user presses Esc)
 * @param onUpdate  callback for live UI updates
 */
export async function runCrawl(
	crwlPath: string,
	args: string[],
	timeoutSec: number,
	signal: AbortSignal | undefined,
	onUpdate: ((update: { content: Array<{ type: "text"; text: string }> }) => void) | undefined,
	baseDirectory?: string,
): Promise<CrawlResult> {
	return new Promise((resolve, reject) => {
		const env = getVenvEnv(crwlPath, baseDirectory);

		const proc = spawn(crwlPath, args, {
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...env, PYTHONUNBUFFERED: "1" },
		});

		let stdout = "";
		let stderr = "";
		let killed = false;

		// Automatically kill after the time limit is exceeded
		const timeoutId = setTimeout(() => {
			killed = true;
			proc.kill("SIGTERM");
			// Force kill if SIGTERM does not work within 5s
			setTimeout(() => proc.kill("SIGKILL"), 5000);
		}, timeoutSec * 1000);

		proc.stdout.on("data", (data: Buffer) => {
			const chunk = data.toString("utf-8");
			stdout += chunk;
			onUpdate?.({
				content: [
					{
						type: "text",
						text: `crawl4ai: ${stdout.length} chars collected…`,
					},
				],
			});
		});

		proc.stderr.on("data", (data: Buffer) => {
			stderr += data.toString("utf-8");
		});

		proc.on("error", (err) => {
			clearTimeout(timeoutId);
			reject(err);
		});

		proc.on("close", (code) => {
			clearTimeout(timeoutId);
			if (killed && code === null) {
				reject(new Error(`Crawl timed out after ${timeoutSec}s`));
			} else {
				resolve({ stdout, stderr, exitCode: code });
			}
		});

		// React to cancellation by the user (Esc in pi)
		signal?.addEventListener("abort", () => {
			proc.kill("SIGTERM");
			reject(new Error("Crawl aborted by user"));
		});
	});
}
