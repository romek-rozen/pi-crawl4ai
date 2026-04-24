/**
 * args.ts
 *
 * Maps the friendly `CrawlParamsType` parameter object to raw CLI flags for `crwl crawl`.
 * Flag order is arbitrary — URL is always last.
 */

import type { CrawlParamsType } from "./types.js";

/** Builds the argument array for `crwl crawl` based on the tool's parameters. */
export function buildArgs(params: CrawlParamsType): string[] {
	const args: string[] = ["crawl"];

	if (params.output_format) args.push("-o", params.output_format);
	if (params.deep_crawl) args.push("--deep-crawl", params.deep_crawl);
	if (params.max_pages !== undefined) args.push("--max-pages", String(params.max_pages));
	if (params.question) args.push("-q", params.question);
	if (params.json_extract) args.push("-j", params.json_extract);
	if (params.schema_path) args.push("-s", params.schema_path);
	if (params.extraction_config) args.push("-e", params.extraction_config);
	if (params.browser_config) args.push("-b", params.browser_config);

	// Crawl4AI CLI starts with cache_mode=BYPASS by default.
	// For our workflow cache should be active by default, so
	// we force cache_mode=enabled unless the user explicitly requested bypass
	// or provided their own cache_mode in crawler_config.
	if (params.bypass_cache) {
		args.push("--bypass-cache");
	} else if (params.crawler_config) {
		args.push(
			"-c",
			params.crawler_config.includes("cache_mode=")
				? params.crawler_config
					: `${params.crawler_config},cache_mode=enabled`,
		);
	} else {
		args.push("-c", "cache_mode=enabled");
	}

	if (params.output_file) args.push("-O", params.output_file);

	// URL always as the last argument
	args.push(params.url);
	return args;
}
