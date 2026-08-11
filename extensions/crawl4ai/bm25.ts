/** Query-aware BM25 filtering for Markdown and plain-text artifacts. */

export interface Bm25FilterResult {
	content: string;
	matchedChunks: number;
	totalChunks: number;
	scores: number[];
}

const WORD = /[\p{L}\p{N}]+/gu;

function tokenize(value: string): string[] {
	return Array.from(value.toLocaleLowerCase().matchAll(WORD), (match) => match[0]);
}

/**
 * Split on Markdown headings, blank-line paragraph boundaries, and keep GFM
 * tables intact. A heading and the blocks below it form one structural chunk.
 */
export function splitStructuralChunks(content: string, format: "markdown" | "text"): string[] {
	const normalized = content.replace(/\r\n?/g, "\n").trim();
	if (!normalized) return [];
	if (format === "text") return normalized.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);

	const blocks = normalized.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
	const chunks: string[] = [];
	let section: string[] = [];
	for (const block of blocks) {
		if (/^#{1,6}\s/m.test(block) && section.length > 0) {
			chunks.push(section.join("\n\n"));
			section = [block];
		} else {
			section.push(block);
		}
	}
	if (section.length > 0) chunks.push(section.join("\n\n"));
	return chunks;
}

/** Filter structural chunks using Okapi BM25 (k1=1.5, b=0.75). */
export function filterWithBm25(
	content: string,
	query: string,
	threshold = 1,
	format: "markdown" | "text" = "markdown",
): Bm25FilterResult {
	const chunks = splitStructuralChunks(content, format);
	const queryTerms = [...new Set(tokenize(query))];
	if (chunks.length === 0 || queryTerms.length === 0) {
		return { content: "", matchedChunks: 0, totalChunks: chunks.length, scores: chunks.map(() => 0) };
	}

	const documents = chunks.map(tokenize);
	const averageLength = documents.reduce((sum, document) => sum + document.length, 0) / documents.length || 1;
	const documentFrequency = new Map<string, number>();
	for (const term of queryTerms) {
		documentFrequency.set(term, documents.filter((document) => document.includes(term)).length);
	}
	const k1 = 1.5;
	const b = 0.75;
	const scores = documents.map((document) => {
		const frequencies = new Map<string, number>();
		for (const token of document) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
		return queryTerms.reduce((score, term) => {
			const frequency = frequencies.get(term) ?? 0;
			if (frequency === 0) return score;
			const df = documentFrequency.get(term) ?? 0;
			const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
			const denominator = frequency + k1 * (1 - b + b * document.length / averageLength);
			return score + idf * frequency * (k1 + 1) / denominator;
		}, 0);
	});
	const selected = chunks.filter((_chunk, index) => scores[index] >= threshold);
	return {
		content: selected.join("\n\n"),
		matchedChunks: selected.length,
		totalChunks: chunks.length,
		scores,
	};
}
