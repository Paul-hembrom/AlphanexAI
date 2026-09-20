/**
 * Serper Google SERP API Integration
 *
 * Provides real-time Google search results for Researcher Mode in Alphanex Studio.
 * When SERPER_API_KEY is configured, queries are sent directly to https://google.serper.dev/search.
 */

import { Citation } from './types';

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  sourceName: string;
  position?: number;
}

export interface SerperSearchOptions {
  numResults?: number;
  countryCode?: string;
  languageCode?: string;
  apiKey?: string | null;
}

/**
 * Extracts a human-readable source/domain name from a URL.
 */
export function extractSourceName(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    return host || 'Web Source';
  } catch {
    return 'Web Source';
  }
}

/**
 * Execute a live Google SERP query via Serper API.
 * Returns an array of search results, or an empty array if unconfigured or on error.
 */
export async function searchSerper(
  query: string,
  options?: SerperSearchOptions
): Promise<SerperSearchResult[]> {
  const apiKey =
    options?.apiKey ||
    process.env.SERPER_API_KEY ||
    process.env.serper_api_key ||
    null;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_SERPER_API_KEY') {
    return [];
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const numResults = options?.numResults ?? 6;
  const gl = options?.countryCode || process.env.SERPER_GL || 'us';
  const hl = options?.languageCode || process.env.SERPER_HL || 'en';

  console.log(`[Serper API] Performing live search for query: "${cleanQuery.slice(0, 100)}" (num: ${numResults}, gl: ${gl}, hl: ${hl})`);

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: cleanQuery,
        num: numResults,
        gl,
        hl,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`[Serper API] HTTP error ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const results: SerperSearchResult[] = [];

    // 1. Answer Box (Featured Snippet)
    if (data.answerBox) {
      const ab = data.answerBox;
      const snippet = ab.snippet ?? ab.answer ?? '';
      if (snippet) {
        results.push({
          title: ab.title ?? 'Direct Answer',
          link: ab.link ?? 'https://google.com',
          snippet: String(snippet),
          sourceName: ab.link ? extractSourceName(ab.link) : 'Google Quick Answer',
          position: 0,
        });
      }
    }

    // 2. Knowledge Graph
    if (data.knowledgeGraph && data.knowledgeGraph.description) {
      const kg = data.knowledgeGraph;
      results.push({
        title: kg.title ?? 'Knowledge Summary',
        link: kg.website ?? 'https://google.com',
        snippet: kg.description,
        sourceName: kg.website ? extractSourceName(kg.website) : 'Knowledge Graph',
        position: 0,
      });
    }

    // 3. Organic Results
    if (Array.isArray(data.organic)) {
      for (const item of data.organic.slice(0, numResults)) {
        if (!item || !item.link) continue;
        results.push({
          title: item.title ?? 'Untitled Source',
          link: item.link,
          snippet: item.snippet ?? '',
          sourceName: extractSourceName(item.link),
          position: item.position,
        });
      }
    }

    console.log(`[Serper API] Retrieved ${results.length} live search result(s) for query: "${cleanQuery.slice(0, 50)}"`);
    return results;
  } catch (error: any) {
    console.warn(`[Serper API] Error fetching search results for "${cleanQuery.slice(0, 50)}":`, error?.message || error);
    return [];
  }
}

/**
 * Converts Serper search hits into application Citation objects for UI rendering.
 */
export function serperResultsToCitations(results: SerperSearchResult[]): Citation[] {
  return results.map((result, index) => ({
    id: `serper-${index + 1}`,
    sourceName: result.sourceName,
    source: result.sourceName,
    title: result.title,
    url: result.link,
    snippet: result.snippet || 'Live search result from Google index via Serper.',
    reliabilityScore: 98,
    reliability: 'High (Verified SERP)',
  }));
}

/**
 * Formats Serper search results into a clean markdown reference block
 * to be injected into system instructions or grounding context.
 */
export function formatSerperResultsForGrounding(results: SerperSearchResult[]): string {
  if (!results.length) return '';

  return results
    .map(
      (r, i) =>
        `[Source ${i + 1}]: "${r.title}"\nPublisher / Domain: ${r.sourceName}\nURL: ${r.link}\nSummary: ${r.snippet}`
    )
    .join('\n\n');
}
