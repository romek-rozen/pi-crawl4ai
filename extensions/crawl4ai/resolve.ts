/**
 * resolve.ts
 *
 * Logika wykrywania binarki `crwl`, przygotowania środowiska uruchomieniowego
 * oraz budowania ścieżek cache/output dla Crawl4AI.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, parse } from "node:path";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

/** Szuka binarki `crwl` w kilku znanych lokalizacjach. */
export function findCrwl(cwd: string): string | null {
	// 1. Nadpisanie przez zmienną środowiskową
	if (process.env.CRAWL4AI_VENV) {
		const p = join(process.env.CRAWL4AI_VENV, "bin", "crwl");
		if (existsSync(p)) return p;
	}

	// 2. Lokalny venv wewnątrz projektu (priorytet)
	const projectVenv = join(cwd, ".pi", "extensions", "crawl4ai", ".venv", "bin", "crwl");
	if (existsSync(projectVenv)) return projectVenv;

	// 3. Globalny venv użytkownika (legacy / fallback)
	const globalVenv = join(homedir(), ".pi", "agent", "extensions", "crawl4ai", ".venv", "bin", "crwl");
	if (existsSync(globalVenv)) return globalVenv;

	// 4. Cokolwiek dostępne w PATH
	try {
		return execSync("which crwl", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
	} catch {
		/* ignore */
	}

	// 5. Tymczasowy venv z instalacji testowej
	if (existsSync("/tmp/crawl4ai-venv/bin/crwl")) return "/tmp/crawl4ai-venv/bin/crwl";

	return null;
}

/** Zwraca bazowy katalog dla Crawl4AI. */
export function resolveCrawl4AiBaseDirectory(cwd: string): string {
	return process.env.CRAWL4_AI_BASE_DIRECTORY?.trim() || cwd;
}

/** Zwraca katalog `.crawl4ai` używany przez Crawl4AI. */
export function getCrawl4AiFolder(cwd: string): string {
	return join(resolveCrawl4AiBaseDirectory(cwd), ".crawl4ai");
}

/** Normalizuje nazwę formatu Crawl4AI do canonical folder name. */
export function normalizeCrawl4AiFormat(format?: string | null): string {
	const value = (format || "markdown").trim().toLowerCase();
	switch (value) {
		case "md":
		case "markdown":
			return "markdown";
		case "md-fit":
		case "markdown-fit":
			return "markdown-fit";
		case "json":
			return "json";
		case "all":
			return "all";
		default:
			return slugifyForFileName(value, "markdown");
	}
}

/** Zamienia dowolny string na bezpieczny slug do pliku/katalogu. */
export function slugifyForFileName(input: string, fallback = "item"): string {
	const normalized = input
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (normalized) return normalized;
	return fallback;
}

/** Normalizuje host do nazwy katalogu domeny. */
export function getCrawl4AiDomainSlug(url: string): string {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
		return host
			.replace(/[^a-z0-9.-]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "") || "unknown-domain";
	} catch {
		return slugifyForFileName(url, "unknown-domain");
	}
}

/** Normalizuje URL path/query do bezpiecznego sluga pliku. */
export function getCrawl4AiUrlSlug(url: string): string {
	try {
		const parsed = new URL(url);
		const pathPart = parsed.pathname.replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
		const queryPart = parsed.search
			? parsed.search
				.slice(1)
				.replace(/[&=]+/g, "-")
				.replace(/[^a-z0-9-]+/gi, "-")
				.replace(/-+/g, "-")
				.replace(/^-+|-+$/g, "")
			: "";
		const combined = [pathPart, queryPart].filter(Boolean).join("-");
		const fallback = pathPart ? pathPart : parsed.hostname;
		return slugifyForFileName(combined || fallback || "home", "home");
	} catch {
		return slugifyForFileName(url, "item");
	}
}

/** Krótki timestamp w formacie YYYY-MM-DD-HH-mm. */
export function formatCrawl4AiTimestamp(date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return [
		date.getFullYear(),
		pad(date.getMonth() + 1),
		pad(date.getDate()),
		pad(date.getHours()),
		pad(date.getMinutes()),
	].join("-");
}

/** Mapuje format Crawl4AI na rozszerzenie pliku wynikowego. */
export function getCrawl4AiOutputExtension(format?: string | null): string {
	switch (normalizeCrawl4AiFormat(format)) {
		case "json":
			return "json";
		case "all":
			return "txt";
		case "markdown-fit":
		case "markdown":
		default:
			return "md";
	}
}

/** Buduje pełną ścieżkę dla outputu crawl4ai w katalogu projektu. */
export function getCrawl4AiOutputPath(
	cwd: string,
	url: string,
	format?: string | null,
	date = new Date(),
): string {
	const baseDir = getCrawl4AiFolder(cwd);
	const domain = getCrawl4AiDomainSlug(url);
	const formatSlug = normalizeCrawl4AiFormat(format);
	const extension = getCrawl4AiOutputExtension(format);
	const timestamp = formatCrawl4AiTimestamp(date);
	const urlSlug = getCrawl4AiUrlSlug(url);
	return join(baseDir, "outputs", domain, formatSlug, `${timestamp}-${urlSlug}.${extension}`);
}

/** Zapewnia unikalną ścieżkę jeśli plik już istnieje. */
export function ensureUniqueCrawl4AiOutputPath(targetPath: string): string {
	if (!existsSync(targetPath)) return targetPath;

	const parsed = parse(targetPath);
	const hash = createHash("sha1").update(targetPath).digest("hex").slice(0, 6);
	let counter = 1;

	while (true) {
		const suffix = counter === 1 ? `-${hash}` : `-${hash}-${counter}`;
		const candidate = join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`);
		if (!existsSync(candidate)) return candidate;
		counter += 1;
	}
}

/** Zwraca zmodyfikowane env dla `spawn`. */
export function getVenvEnv(crwlPath: string, baseDirectory?: string): NodeJS.ProcessEnv {
	const env = { ...process.env };
	const binDir = dirname(crwlPath);
	const venvRoot = dirname(binDir);
	env.VIRTUAL_ENV = venvRoot;
	env.PATH = `${binDir}${env.PATH ? ":" + env.PATH : ""}`;
	if (baseDirectory && !env.CRAWL4_AI_BASE_DIRECTORY) {
		env.CRAWL4_AI_BASE_DIRECTORY = baseDirectory;
	}
	return env;
}
