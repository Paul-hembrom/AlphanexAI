/**
 * Tavily AI Search Provider Integration
 *
 * Dedicated LLM RAG search provider.
 * Activated only when TAVILY_API_KEY is configured and user selects Tavily in Researcher settings.
 * Fails honestly: Never fabricates mock results or invented search hits.
 */

import { Citation } from './types';
import { SearchHit } from './server';
import { extractSourceName } from './serper';

export interface TavilySearchOptions {
  numResults?: number;
  apiKey?: string | null;
  searchDepth?: 'basic' | 'advanced';
}

export interface TavilySearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceName: string;
  score?: number;
}

/**
 * Execute live search queries using Tavily AI Search API.
 * Returns empty array if unconfigured or on error.
 */
export async function searchTavily(
  query: string,
  options?: TavilySearchOptions
): Promise<TavilySearchResult[]> {
  const apiKey =
    options?.apiKey ||
    process.env.TAVILY_API_KEY ||
    process.env.tavily_api_key ||
    null;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_TAVILY_API_KEY') {
    return [];
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const maxResults = options?.numResults ?? 5;
  const searchDepth = options?.searchDepth ?? 'basic';

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey.trim(),
        query: cleanQuery,
        search_depth: searchDepth,
        include_answer: false,
        max_results: maxResults,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`[Tavily API] HTTP error ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const results: TavilySearchResult[] = [];

    if (Array.isArray(data.results)) {
      for (const item of data.results) {
        if (!item || !item.url) continue;
        results.push({
          title: item.title || 'Untitled Source',
          url: item.url,
          snippet: item.content || '',
          sourceName: extractSourceName(item.url),
          score: typeof item.score === 'number' ? Math.round(item.score * 100) : undefined,
        });
      }
    }

    return results;
  } catch (error: any) {
    console.warn(`[Tavily API] Error fetching results for "${cleanQuery.slice(0, 50)}":`, error?.message || error);
    return [];
  }
}

export function tavilyResultsToSearchHits(results: TavilySearchResult[]): SearchHit[] {
  return results.map((r) => ({
    title: r.title,
    link: r.url,
    snippet: r.snippet,
  }));
}

export function tavilyResultsToCitations(results: TavilySearchResult[]): Citation[] {
  return results.map((result, index) => {
    return {
      id: `tavily-${index + 1}`,
      sourceName: result.sourceName,
      source: result.sourceName,
      title: result.title,
      url: result.url,
      snippet: result.snippet || 'Live search result via Tavily AI.',
      ...(result.score !== undefined ? { reliabilityScore: result.score } : {}),
      reliability: result.score && result.score > 80 ? 'High (RAG Optimized)' : 'Standard (Web Reference)',
    };
  });
}
