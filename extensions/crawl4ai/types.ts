/**
 * types.ts
 *
 * Parameter schemas (Typebox) and interfaces used by the rest of the extension.
 */

import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "typebox";

/** Parameters of the `crawl4ai` tool — mapped to CLI flags of `crwl crawl`. */
export const CrawlParams = Type.Object({
	url: Type.String({ description: "URL to crawl" }),
	output_format: Type.Optional(
		StringEnum(["markdown", "markdown-fit", "md", "md-fit", "json", "all"] as const),
	),
	deep_crawl: Type.Optional(
		StringEnum(["bfs", "dfs", "best-first"] as const),
	),
	max_pages: Type.Optional(
		Type.Number({ description: "Max pages for deep crawl" }),
	),
	question: Type.Optional(
		Type.String({ description: "Ask a question about the crawled content" }),
	),
	json_extract: Type.Optional(
		Type.String({
			description:
				"LLM extraction prompt (e.g. 'Extract all product prices'). Requires LLM provider in crawl4ai.",
		}),
	),
	schema_path: Type.Optional(
		Type.String({
			description:
				"Path to JSON schema file for structured extraction. Requires extraction_config.",
		}),
	),
	extraction_config: Type.Optional(
		Type.String({
			description:
				"Extraction strategy config file (YAML/JSON). Required for schema_path.",
		}),
	),
	browser_config: Type.Optional(
		Type.String({
			description: "Browser params as key1=value1,key2=value2",
		}),
	),
	crawler_config: Type.Optional(
		Type.String({
			description: "Crawler params as key1=value1,key2=value2",
		}),
	),
	bypass_cache: Type.Optional(
		Type.Boolean({ default: false, description: "Bypass cache" }),
	),
	output_file: Type.Optional(
		Type.String({
			description:
				"Save full output to this file path instead of returning it inline",
		}),
	),
	timeout: Type.Optional(
		Type.Number({ default: 60, description: "Timeout in seconds" }),
	),
});

/** Type generated from CrawlParams (used at runtime). */
export type CrawlParamsType = import("typebox").Static<typeof CrawlParams>;

/** Metadata returned in `details` of every tool result. */
export interface CrawlDetails {
	url: string;
	command: string;
	args: string[];
	exitCode: number | null;
	truncated?: boolean;
	fullOutputPath?: string;
	outputFile?: string;
	stderr?: string;
	stdoutPreview?: string;
}
