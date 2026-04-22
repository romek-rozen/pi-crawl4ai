/**
 * args.ts
 *
 * Mapuje przyjazny obiekt parametrów `CrawlParamsType` na surowe flagi CLI `crwl crawl`.
 * Kolejność flag jest dowolna — URL zawsze na końcu.
 */

import type { CrawlParamsType } from "./types.js";

/** Buduje tablicę argumentów dla `crwl crawl` na podstawie parametrów z toola. */
export function buildArgs(params: CrawlParamsType): string[] {
	const args: string[] = ["crawl"];

	if (params.output_format) args.push("-o", params.output_format);
	if (params.deep_crawl) args.push("--deep-crawl", params.deep_crawl);
	if (params.max_pages !== undefined) args.push("--max-pages", String(params.max_pages));
	if (params.question) args.push("-q", params.question);
	if (params.json_extract) args.push("-j", params.json_extract);
	if (params.schema_path) args.push("-s", params.schema_path);
	if (params.browser_config) args.push("-b", params.browser_config);

	// Crawl4AI CLI domyślnie startuje z cache_mode=BYPASS.
	// Dla naszego workflow cache ma być domyślnie aktywny, więc
	// wymuszamy cache_mode=enabled, chyba że user jawnie poprosił o bypass
	// albo podał własne cache_mode w crawler_config.
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

	// URL zawsze jako ostatni argument
	args.push(params.url);
	return args;
}
