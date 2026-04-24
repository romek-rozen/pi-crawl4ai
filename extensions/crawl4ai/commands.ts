/**
 * commands.ts
 *
 * Registration of slash commands available to the user:
 *   /crawl4ai-install       – creates a venv and installs crawl4ai locally in the project
 *   /crawl4ai-test          – runs a smoke test crawl on example.com
 *   /crawl4ai-status        – shows the detected binary path
 *   /crawl4ai-clear-cache   – clears local crawl4ai cache
 *   /crawl4ai-setup-agents  – symlinks agent definitions for use with subagent/run
 */

import { join, dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, readlinkSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { findCrwl, getCrawl4AiFolder, getVenvEnv } from "./resolve.js";

/**
 * Registers all commands related to crawl4ai.
 *
 * @param pi        extension API
 * @param onInstall callback invoked after a successful installation — updates the path cache
 */
export function registerCommands(pi: ExtensionAPI, onInstall: (path: string) => void) {
	pi.registerCommand("crawl4ai-install", {
		description: "[crawl4ai] Install crawl4ai into a local venv (project-local)",
		handler: async (_args, ctx) => {
			const venvDir = join(ctx.cwd, ".pi", "extensions", "crawl4ai", ".venv");
			const python = process.env.PI_PYTHON || "python3";

			ctx.ui.notify("[crawl4ai] Creating venv…", "info");
			try {
				execSync(`${python} -m venv "${venvDir}"`, { stdio: "inherit" });
			} catch (err: any) {
				ctx.ui.notify(`[crawl4ai] venv creation failed: ${err.message}`, "error");
				return;
			}

			ctx.ui.notify("[crawl4ai] Installing crawl4ai (this may take a minute)…", "info");
			try {
				const pip = join(venvDir, "bin", "pip");
				execSync(`${pip} install -U crawl4ai`, { stdio: "inherit" });
			} catch (err: any) {
				ctx.ui.notify(`[crawl4ai] pip install failed: ${err.message}`, "error");
				return;
			}

			ctx.ui.notify("[crawl4ai] Running smoke test…", "info");
			try {
				const crwlLocal = join(venvDir, "bin", "crwl");
				execSync(`${crwlLocal} --help`, { stdio: "pipe" });
				onInstall(crwlLocal);
				ctx.ui.notify("[crawl4ai] Installed successfully!", "success");
			} catch (err: any) {
				ctx.ui.notify(`[crawl4ai] Smoke test failed: ${err.message}`, "error");
			}
		},
	});

	pi.registerCommand("crawl4ai-test", {
		description: "[crawl4ai] Run a smoke test crawl on example.com",
		handler: async (_args, ctx) => {
			const path = findCrwl(ctx.cwd);
			if (!path) {
				ctx.ui.notify("[crawl4ai] Binary not found. Install first via /crawl4ai-install.", "error");
				return;
			}
			ctx.ui.notify("[crawl4ai] Running smoke test on example.com…", "info");
			try {
				const output = execSync(`${path} crawl https://example.com -o markdown`, {
					encoding: "utf-8",
					stdio: ["pipe", "pipe", "ignore"],
					timeout: 30000,
					env: getVenvEnv(path, ctx.cwd),
				});
				const lines = output.trim().split("\n").slice(0, 5).join("\n");
				ctx.ui.notify(`[crawl4ai] Smoke test OK:\n${lines}`, "success");
			} catch (err: any) {
				ctx.ui.notify(`[crawl4ai] Smoke test failed: ${err.message}`, "error");
			}
		},
	});

	pi.registerCommand("crawl4ai-clear-cache", {
		description: "[crawl4ai] Clear local crawl4ai cache (.crawl4ai/cache + .crawl4ai/robots)",
		handler: async (_args, ctx) => {
			const crawlBaseDir = getCrawl4AiFolder(ctx.cwd);
			const targets = [join(crawlBaseDir, "cache"), join(crawlBaseDir, "robots")];
			try {
				for (const target of targets) {
					rmSync(target, { recursive: true, force: true });
				}
				ctx.ui.notify("[crawl4ai] Local cache cleared.", "success");
			} catch (err: any) {
				ctx.ui.notify(`[crawl4ai] Cache clear failed: ${err.message}`, "error");
			}
		},
	});

	pi.registerCommand("crawl4ai-status", {
		description: "[crawl4ai] Show binary path and version",
		handler: async (_args, ctx) => {
			const path = findCrwl(ctx.cwd);
			if (!path) {
				ctx.ui.notify("[crawl4ai] Binary not found.", "warning");
				return;
			}
			try {
				const help = execSync(`${path} --help`, {
					encoding: "utf-8",
					stdio: ["pipe", "pipe", "ignore"],
				});
				const firstLine = help.split("\n")[0];
				ctx.ui.notify(`[crawl4ai] Binary: ${path}`, "info");
				ctx.ui.notify(`[crawl4ai] ${firstLine}`, "info");
			} catch {
				ctx.ui.notify(`[crawl4ai] Binary: ${path} (version check failed)`, "info");
			}
		},
	});

	pi.registerCommand("crawl4ai-setup-agents", {
		description: "[crawl4ai] Symlink crawl4ai agents to ~/.pi/agent/agents/ for use with `run`",
		handler: async (_args, ctx) => {
			const extensionDir = dirname(fileURLToPath(import.meta.url));
			const packageRoot = resolve(extensionDir, "..", "..");
			const agentsSourceDir = join(packageRoot, "agents");

			if (!existsSync(agentsSourceDir)) {
				ctx.ui.notify("[crawl4ai] agents/ directory not found in package.", "error");
				return;
			}

			const targetDir = join(getAgentDir(), "agents");
			mkdirSync(targetDir, { recursive: true });

			const agentFiles = readdirSync(agentsSourceDir).filter((f) => f.endsWith(".md"));
			if (agentFiles.length === 0) {
				ctx.ui.notify("[crawl4ai] No agent definitions found.", "warning");
				return;
			}

			const results: string[] = [];
			for (const file of agentFiles) {
				const source = join(agentsSourceDir, file);
				const target = join(targetDir, file);

				// Remove existing symlink if it points somewhere else
				if (existsSync(target)) {
					try {
						const existing = readlinkSync(target);
						if (existing === source) {
							results.push(`${file} (already linked)`);
							continue;
						}
						unlinkSync(target);
					} catch {
						// Not a symlink — skip to avoid overwriting user files
						results.push(`${file} (skipped — file exists)`);
						continue;
					}
				}

				symlinkSync(source, target);
				results.push(`${file} (linked)`);
			}

			ctx.ui.notify(
				`[crawl4ai] Agents set up in ${targetDir}:\n${results.map((r) => `  ${r}`).join("\n")}`,
				"success",
			);
		},
	});
}
