/**
 * validate.ts
 *
 * Pure, dependency-free validation of crawl requests.
 *
 * Kept free of any runtime imports (only a type-only import, erased at build/run
 * time) so it can be unit-tested in isolation without loading the pi runtime.
 *
 * Related: GitHub issue #1 — "JSON output fails for deep crawl (NoneType error)".
 * Crawl4AI cannot produce JSON output during a deep crawl, so we reject that
 * combination with a clear message *before* spawning the crawler instead of
 * surfacing an opaque "Exited with code 1".
 */

import type { CrawlParamsType } from "./types.js";

/**
 * Validates a crawl request. Returns a human-readable error string if the
 * request is invalid, or `null` if it is safe to run.
 */
export function validateCrawlRequest(params: CrawlParamsType): string | null {
	if (params.output_format === "json") {
		// Deep crawl + JSON is unsupported by Crawl4AI itself (issue #1).
		// Check this first so the user gets the most relevant reason, even when
		// no extraction strategy was provided.
		if (params.deep_crawl) {
			return (
				"output_format=json with deep_crawl is not supported by Crawl4AI. " +
				"Use markdown output for deep crawls, or crawl a single page with JSON extraction."
			);
		}

		const hasLlmExtraction = Boolean(params.json_extract?.trim());
		const hasSchemaExtraction = Boolean(
			params.schema_path?.trim() && params.extraction_config?.trim(),
		);
		if (!hasLlmExtraction && !hasSchemaExtraction) {
			return (
				"output_format=json requires an extraction strategy. " +
				"Use json_extract (LLM) or schema_path + extraction_config (CSS/XPath). " +
				"Example extraction_config YAML:\n" +
				"type: json-css\nparams:\n  verbose: true"
			);
		}
	}
	return null;
}
