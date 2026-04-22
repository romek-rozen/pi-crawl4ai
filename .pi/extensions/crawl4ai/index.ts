/**
 * index.ts
 *
 * Entry point extensionu crawl4ai dla pi.
 *
 * Odpowiedzialność: podpięcie pod ExtensionAPI — rejestracja toola, komend
 * i listenera session_start. Cała logika biznesowa żyje w importowanych modułach.
 *
 * Struktura katalogu:
 *   types.ts   – schemy Typebox + interfejsy
 *   resolve.ts – wykrywanie binarki crwl i venv
 *   runner.ts  – spawn subprocess z timeout / abort
 *   args.ts    – mapowanie params → flagi CLI
 *   format.ts  – truncowanie i zapis do pliku tymczasowego
 *   render.ts  – custom TUI rendering
 *   tool.ts    – definicja i execute toola `crawl4ai`
 *   commands.ts – komendy /crawl4ai-*
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

import { findCrwl } from "./resolve.js";
import { crawlToolMeta, executeCrawl, renderCall, renderResult } from "./tool.js";
import { registerCommands } from "./commands.js";

export default function crawl4aiExtension(pi: ExtensionAPI) {
	/** Aktualnie znana ścieżka do `crwl` (cache na poziomie sesji). */
	let cachedCrwlPath: string | null = null;

	/** Pobiera (lub odnajduje) ścieżkę do crwl. */
	function resolveCrwl(ctx: ExtensionContext): string | null {
		if (cachedCrwlPath) return cachedCrwlPath;
		cachedCrwlPath = findCrwl(ctx.cwd);
		return cachedCrwlPath;
	}

	/** Sprawdza czy crwl jest dostępny; jeśli nie — pokazuje notify i zwraca false. */
	function checkInstalled(ctx: ExtensionContext): boolean {
		if (resolveCrwl(ctx)) return true;
		ctx.ui.notify(
			"[crawl4ai] Binary not found. Run /crawl4ai-install or set CRAWL4AI_VENV env var.",
			"error",
		);
		return false;
	}

	// ── Rejestracja custom toola widocznego dla LLM ──
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

	// ── Rejestracja komend slash dla użytkownika ──
	registerCommands(pi, (newPath) => {
		cachedCrwlPath = newPath; // aktualizacja cache po udanej instalacji
	});

	// ─-- Listener startu sesji: ostrzeżenie jeśli brak crawl4ai --─
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
