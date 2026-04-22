/**
 * runner.ts
 *
 * Niskopoziomowe wykonanie komendy `crwl crawl` przez `node:child_process/spawn`.
 * Obsługuje timeout, abort (Ctrl+C), streaming stdout do UI oraz zbieranie stderr.
 */

import { spawn } from "node:child_process";
import { getVenvEnv } from "./resolve.js";

export interface CrawlResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

/**
 * Uruchamia `crwl crawl <args>` z opcjonalnym streamingiem postępu do TUI.
 *
 * @param crwlPath  absolutna ścieżka do binarki crwl
 * @param args      argumenty CLI (bez samego "crwl")
 * @param timeoutSec  maksymalny czas oczekiwania w sekundach
 * @param signal    AbortSignal z pi (np. gdy użytkownik naciśnie Esc)
 * @param onUpdate  callback do aktualizacji UI na żywo
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

		// Automatyczne zabicie po przekroczeniu limitu czasu
		const timeoutId = setTimeout(() => {
			killed = true;
			proc.kill("SIGTERM");
			// Drastyczne zabicie jeśli SIGTERM nie zadziała w 5s
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

		// Reakcja na anulowanie przez użytkownika (Esc w pi)
		signal?.addEventListener("abort", () => {
			proc.kill("SIGTERM");
			reject(new Error("Crawl aborted by user"));
		});
	});
}
