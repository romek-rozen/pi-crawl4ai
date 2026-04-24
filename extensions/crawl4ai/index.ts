/**
 * index.ts
 *
 * Entry point for the crawl4ai extension for pi.
 *
 * Responsibility: hooking into ExtensionAPI — registering the tool, commands,
 * and the session_start listener. All business logic lives in imported modules.
 *
 * Directory structure:
 *   types.ts   – Typebox schemas + interfaces
 *   resolve.ts – detection of the crwl binary and venv
 *   runner.ts  – spawning subprocess with timeout / abort
 *   args.ts    – mapping params → CLI flags
 *   format.ts  – truncation and writing to a temporary file
 *   render.ts  – custom TUI rendering
 *   tool.ts    – definition and execution of the `crawl4ai` tool
 *   commands.ts – /crawl4ai-* commands
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

import { findCrwl } from "./resolve.js";
import { crawlToolMeta, executeCrawl, renderCall, renderResult } from "./tool.js";
import { registerCommands } from "./commands.js";

export default function crawl4aiExtension(pi: ExtensionAPI) {
	/** Currently known path to `crwl` (session-level cache). */
	let cachedCrwlPath: string | null = null;

	/** Retrieves (or locates) the path to crwl. */
	function resolveCrwl(ctx: ExtensionContext): string | null {
		if (cachedCrwlPath) return cachedCrwlPath;
		cachedCrwlPath = findCrwl(ctx.cwd);
		return cachedCrwlPath;
	}

	/** Checks whether crwl is available; if not — shows a notification and returns false. */
	function checkInstalled(ctx: ExtensionContext): boolean {
		if (resolveCrwl(ctx)) return true;
		ctx.ui.notify(
			"[crawl4ai] Binary not found. Run /crawl4ai-install or set CRAWL4AI_VENV env var.",
			"error",
		);
		return false;
	}

	// ── Register custom tool visible to the LLM ──
	pi.registerTool({
		...crawlToolMeta,
		renderCall,
		renderResult,
		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			if (!checkInstalled(ctx)) {
				return {
					content: [
						{
							type: "text",
							text:
								"[crawl4ai] Not installed.\n" +
								"Run /crawl4ai-install to set it up automatically, " +
								"or install manually: pip install crawl4ai && crawl4ai-setup",
						},
					],
					details: { installed: false },
					isError: true,
				};
			}
			return executeCrawl(params, signal, onUpdate, ctx, cachedCrwlPath!);
		},
	});

	// ── Register slash commands for the user ──
	registerCommands(pi, (newPath) => {
		cachedCrwlPath = newPath; // update cache after a successful installation
	});

	// ─-- Session start listener: warning if crawl4ai is missing --─
	pi.on("session_start", async (_event, ctx) => {
		cachedCrwlPath = findCrwl(ctx.cwd);
		if (!cachedCrwlPath) {
			ctx.ui.notify(
				"[crawl4ai] Not found. Run /crawl4ai-install to install, or set CRAWL4AI_VENV env var.",
				"warning",
			);
		}
	});
}
