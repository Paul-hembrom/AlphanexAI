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

/**
 * Checks whether a user prompt represents an actual research or search inquiry
 * that warrants real-time Google search grounding via Serper.
 *
 * Conservative design:
 * - Casual conversational inputs (greetings, single words, <4 words without question structure)
 *   skip search entirely to avoid wasteful or nonsensical searches (e.g. searching for "hi").
 * - False negatives (skipping a search that could have run) are strictly preferred over false positives.
 */
export function isResearchQuery(prompt: string): boolean {
  if (!prompt || typeof prompt !== 'string') return false;

  const trimmed = prompt.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  // Strip common trailing punctuation for clean matching
  const clean = lower.replace(/[!?,.:;]+$/g, '').trim();

  // 1. Casual greetings, pleasantries, and small talk
  const casualPhrases = new Set([
    'hi',
    'hello',
    'hey',
    'hey there',
    'hi there',
    'greetings',
    'good morning',
    'good afternoon',
    'good evening',
    'good night',
    'howdy',
    'sup',
    "what's up",
    'whats up',
    'yo',
    'namaste',
    'hola',
    'how are you',
    'how are you doing',
    "how's it going",
    'hows it going',
    'who are you',
    'what are you',
    'what can you do',
    'help',
    'test',
    'testing',
    'ping',
    'pong',
    'thanks',
    'thank you',
    'thx',
    'ok',
    'okay',
    'cool',
    'great',
    'awesome',
    'sure',
    'yes',
    'no',
    'yep',
    'nope',
    'bye',
    'goodbye',
    'see you',
  ]);

  if (casualPhrases.has(clean)) {
    return false;
  }

  // Tokenize words
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  // Explicit search directives that trigger a search
  const searchDirectives = ['search', 'google', 'find', 'lookup', 'research', 'cite', 'sources'];
  const startsWithSearchDirective =
    searchDirectives.includes(words[0]) || (words.length >= 2 && words[0] === 'look' && words[1] === 'up');

  // 2. Under 4 words constraint
  if (words.length < 4) {
    if (startsWithSearchDirective && words.length >= 2) {
      return true; // e.g. "search nepal", "find gdp"
    }

    const hasQuestionMark = trimmed.includes('?');
    const questionStarters = ['who', 'what', 'where', 'when', 'why', 'how', 'which', 'is', 'are', 'can', 'does', 'did', 'will'];
    const startsWithQuestion = questionStarters.includes(words[0]);

    // If starts with question word and has at least 3 words or explicit question mark (e.g. "what is gdp?", "who is pm?")
    if (startsWithQuestion && (hasQuestionMark || words.length === 3)) {
      // Exclude casual phrases
      if (clean === 'who are you' || clean === 'how are you' || clean === 'what are you') {
        return false;
      }
      return true;
    }

    // Check for explicit research/factual keywords or year in 2-3 word queries (e.g. "nepal gdp", "kathmandu traffic status")
    const hasYear = /\b20[1-3][0-9]\b/.test(trimmed);
    const hasStrongResearchKeyword = [
      'gdp',
      'inflation',
      'census',
      'budget',
      'population',
      'nepal',
      'kathmandu',
      'election',
      'benchmark',
      'traffic',
      'weather',
      'stocks',
      'shares',
    ].some((kw) => words.includes(kw));

    if (words.length >= 2 && (hasYear || (hasStrongResearchKeyword && words.length >= 3))) {
      return true;
    }

    // Otherwise, under 4 words without explicit question structure or search directive is skipped
    return false;
  }

  // 3. 4 words or more:
  const hasQuestionMark = trimmed.includes('?');
  const interrogatives = ['who', 'what', 'where', 'when', 'why', 'how', 'which', 'whose', 'whom'];
  const hasInterrogative = words.some((w) => interrogatives.includes(w));

  const researchKeywords = [
    'research',
    'search',
    'find',
    'look up',
    'lookup',
    'investigate',
    'analyze',
    'analysis',
    'report',
    'study',
    'studies',
    'paper',
    'papers',
    'article',
    'sources',
    'source',
    'cite',
    'citation',
    'citations',
    'statistics',
    'stats',
    'data',
    'metrics',
    'rate',
    'rates',
    'gdp',
    'inflation',
    'population',
    'latest',
    'recent',
    'current',
    'news',
    'history',
    'historical',
    'overview',
    'explain',
    'market',
    'policy',
    'regulation',
    'government',
    'infrastructure',
    'nepal',
    'kathmandu',
    'benchmark',
    'comparison',
    'compare',
    'difference between',
    'timeline',
  ];

  const hasResearchKeyword = researchKeywords.some((kw) => lower.includes(kw));
  const hasYear = /\b20[1-3][0-9]\b/.test(trimmed);

  // If it has question structure, research keywords, year reference, or explicit search directive
  if (hasQuestionMark || hasResearchKeyword || hasInterrogative || hasYear || startsWithSearchDirective) {
    return true;
  }

  // If query is >= 6 words and not purely casual greetings
  if (words.length >= 6) {
    return true;
  }

  return false;
}

