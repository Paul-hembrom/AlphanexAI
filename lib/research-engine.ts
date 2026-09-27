/**
 * Deep Research Engine for AlphanexAI
 *
 * Implements a true multi-stage retrieval loop competing with Perplexity-style grounding:
 * 1. Multi-facet Query Planner scaled to effort tier and subscription plan limits.
 * 2. Parallel multi-source web search (Google via Serper, or Tavily AI if configured).
 * 3. Deep page text extraction via Jina Reader (r.jina.ai) for Medium+ effort.
 * 4. Deduplication, URL hygiene, and grounded evidence assembly.
 * 5. Honest failure handling: NEVER invent fake citations, statistics, or sources.
 */

import { Citation } from './types';
import { SearchHit, createParallelRetriever } from './server';
import { extractSourceName, searchSerper } from './serper';
import { searchTavily, tavilyResultsToSearchHits } from './tavily';

export type ResearchEffort = 'Low' | 'Medium' | 'High' | 'Extra' | 'Max';

export interface ResearchPlan {
  effort: ResearchEffort;
  maxQueries: number;
  resultsPerQuery: number;
  scrapePageCount: number;
}

export const EFFORT_RESEARCH_PLANS: Record<ResearchEffort, ResearchPlan> = {
  Low: {
    effort: 'Low',
    maxQueries: 1,
    resultsPerQuery: 5,
    scrapePageCount: 0,
  },
  Medium: {
    effort: 'Medium',
    maxQueries: 3,
    resultsPerQuery: 5,
    scrapePageCount: 3,
  },
  High: {
    effort: 'High',
    maxQueries: 6,
    resultsPerQuery: 5,
    scrapePageCount: 6,
  },
  Extra: {
    effort: 'Extra',
    maxQueries: 8,
    resultsPerQuery: 5,
    scrapePageCount: 8,
  },
  Max: {
    effort: 'Max',
    maxQueries: 12,
    resultsPerQuery: 6,
    scrapePageCount: 10,
  },
};

/**
 * Caps user requested effort according to subscription plan tier:
 * lite  → max Medium
 * mid   → max Extra
 * upper → Max allowed
 */
export function capEffortByPlan(
  effort: ResearchEffort,
  planTier: 'lite' | 'mid' | 'upper' | string
): ResearchEffort {
  const tier = (planTier || 'lite').toLowerCase();

  if (tier === 'lite') {
    if (effort === 'High' || effort === 'Extra' || effort === 'Max') {
      return 'Medium';
    }
    return effort;
  }

  if (tier === 'mid') {
    if (effort === 'Max') {
      return 'Extra';
    }
    return effort;
  }

  return effort;
}

/**
 * Normalizes input string to canonical ResearchEffort.
 */
export function normalizeResearchEffort(effort?: string): ResearchEffort {
  if (!effort) return 'Medium';
  const val = effort.trim().toLowerCase();
  if (val === 'low') return 'Low';
  if (val === 'medium') return 'Medium';
  if (val === 'high') return 'High';
  if (val === 'extra') return 'Extra';
  if (val === 'max') return 'Max';
  return 'Medium';
}

/**
 * Cleans a user prompt for effective keyword-based search queries.
 */
function cleanCoreQuery(prompt: string): string {
  return prompt
    .replace(/^([wW]hat is|[wW]ho is|[tT]ell me about|[cC]an you search for|[pP]lease research|[eE]xplain|[wW]rite an analysis of|[cC]ompare|[gG]ive me)\s+/i, '')
    .replace(/[?!.]+$/g, '')
    .trim();
}

/**
 * Plans targeted search queries matching the assigned effort tier and domain bias.
 */
export function planResearchQueries(
  prompt: string,
  opts: { effort: ResearchEffort; nepaliGroundingBias: boolean }
): string[] {
  const core = cleanCoreQuery(prompt);
  const effort = opts.effort;
  const bias = opts.nepaliGroundingBias;

  const queries: string[] = [core || prompt.trim()];

  if (effort === 'Low') {
    return queries.slice(0, 1);
  }

  // Medium (3 queries)
  queries.push(`${core} key facts overview latest`);
  queries.push(`${core} statistics report`);

  if (effort === 'Medium') {
    if (bias) {
      queries[2] = `${core} Nepal context policy statistics`;
    }
    return queries.slice(0, 3);
  }

  // High (6 queries)
  queries.push(`${core} official data documentation`);
  queries.push(`${core} current trends analysis`);
  if (bias) {
    queries.push(`${core} (site:nrb.org.np OR site:lawcommission.gov.np OR site:mocit.gov.np OR site:tu.edu.np)`);
  } else {
    queries.push(`${core} industry benchmarks research`);
  }

  if (effort === 'High') {
    return queries.slice(0, 6);
  }

  // Extra (8 queries)
  queries.push(`${core} latest news updates 2025 2026`);
  queries.push(`${core} (site:arxiv.org OR filetype:pdf OR site:edu)`);

  if (effort === 'Extra') {
    return queries.slice(0, 8);
  }

  // Max (10-12 queries)
  queries.push(`${core} architectural trade-offs comparison`);
  queries.push(`${core} critiques controversies challenges`);
  queries.push(`${core} technical specifications standard`);
  if (bias) {
    queries.push(`${core} Nepal Rastra Bank ministry gazette circular`);
  } else {
    queries.push(`${core} comprehensive whitepaper case study`);
  }

  return queries.slice(0, 12);
}

/**
 * Normalizes URLs to prevent redundant duplicate queries and scrapes.
 */
function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((p) =>
      parsed.searchParams.delete(p)
    );
    return (parsed.origin + parsed.pathname.replace(/\/+$/, '') + (parsed.search ? parsed.search : '')).toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

export interface RunResearchOptions {
  effort?: string;
  planTier?: string;
  searchProvider?: 'tavily' | 'serper_searxng' | string;
  nepaliGroundingBias?: boolean;
  citationDensity?: 'inline_brackets' | 'footnote_bibliography' | string;
  serperApiKey?: string | null;
  tavilyApiKey?: string | null;
  jinaApiKey?: string | null;
  onProgress?: (event: { step: string; message: string }) => void;
}

export interface RunResearchResult {
  success: boolean;
  needsSearchKey?: boolean;
  error?: string;
  queries: string[];
  hits: SearchHit[];
  scraped: Record<string, string>;
  citations: Citation[];
  groundingMarkdown: string;
  effectiveEffort: ResearchEffort;
  effortCappedNotice?: string;
}

/**
 * Executes a full multi-stage live research pipeline.
 */
export async function runResearch(
  prompt: string,
  opts: RunResearchOptions = {}
): Promise<RunResearchResult> {
  const requestedEffort = normalizeResearchEffort(opts.effort);
  const planTier = (opts.planTier || 'lite').toLowerCase();
  const effectiveEffort = capEffortByPlan(requestedEffort, planTier);

  let effortCappedNotice: string | undefined;
  if (requestedEffort !== effectiveEffort) {
    effortCappedNotice = `${planTier.toUpperCase()} plan caps research depth at ${effectiveEffort}. Upgrade to Mid/Upper for Extra/Max.`;
  }

  const nepaliGroundingBias = opts.nepaliGroundingBias ?? true;
  const preferredProvider = opts.searchProvider || 'serper_searxng';

  const serperKey =
    opts.serperApiKey ||
    process.env.SERPER_API_KEY ||
    process.env.serper_api_key ||
    null;

  const tavilyKey =
    opts.tavilyApiKey ||
    process.env.TAVILY_API_KEY ||
    process.env.tavily_api_key ||
    null;

  const jinaKey =
    opts.jinaApiKey ||
    process.env.JINA_API_KEY ||
    undefined;

  // Determine active search provider
  let activeProvider: 'tavily' | 'serper' | null = null;
  if (preferredProvider === 'tavily' && tavilyKey && tavilyKey !== 'MY_TAVILY_API_KEY') {
    activeProvider = 'tavily';
  } else if (serperKey && serperKey !== 'MY_SERPER_API_KEY') {
    activeProvider = 'serper';
  }

  // Honest failure: If no live search key is configured, stop immediately
  if (!activeProvider) {
    return {
      success: false,
      needsSearchKey: true,
      error:
        'Search is unconfigured. Set SERPER_API_KEY (or TAVILY_API_KEY) in environment variables to enable live research grounding.',
      queries: [],
      hits: [],
      scraped: {},
      citations: [],
      groundingMarkdown: '',
      effectiveEffort,
      effortCappedNotice,
    };
  }

  const plan = EFFORT_RESEARCH_PLANS[effectiveEffort];
  const queries = planResearchQueries(prompt, {
    effort: effectiveEffort,
    nepaliGroundingBias,
  }).slice(0, plan.maxQueries);

  opts.onProgress?.({
    step: 'planning',
    message: `Planning ${queries.length} targeted search queries (${effectiveEffort} depth)...`,
  });

  opts.onProgress?.({
    step: 'searching',
    message: `Searching the live web (${queries.length} queries via ${activeProvider === 'tavily' ? 'Tavily AI' : 'Serper Google index'})...`,
  });

  const countryCode = nepaliGroundingBias ? 'np' : (process.env.SERPER_GL || 'us');
  const languageCode = nepaliGroundingBias ? 'ne' : (process.env.SERPER_HL || 'en');

  // Run all queries in parallel with 8s timeouts
  const searchSettled = await Promise.allSettled(
    queries.map(async (q) => {
      if (activeProvider === 'tavily') {
        const tavilyResults = await searchTavily(q, {
          apiKey: tavilyKey,
          numResults: plan.resultsPerQuery,
        });
        return tavilyResultsToSearchHits(tavilyResults);
      } else {
        const serperResults = await searchSerper(q, {
          apiKey: serperKey,
          numResults: plan.resultsPerQuery,
          countryCode,
          languageCode,
        });
        return serperResults.map((r) => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet,
        }));
      }
    })
  );

  // Collect and deduplicate results
  const seenUrls = new Set<string>();
  const uniqueHits: SearchHit[] = [];

  for (const s of searchSettled) {
    if (s.status !== 'fulfilled') continue;
    for (const hit of s.value) {
      if (!hit.link || !hit.link.startsWith('http')) continue;
      const normalized = normalizeUrl(hit.link);
      if (seenUrls.has(normalized)) continue;
      seenUrls.add(normalized);
      uniqueHits.push(hit);
    }
  }

  if (uniqueHits.length === 0) {
    return {
      success: false,
      error: 'Live web search returned no accessible results for the planned queries.',
      queries,
      hits: [],
      scraped: {},
      citations: [],
      groundingMarkdown: '',
      effectiveEffort,
      effortCappedNotice,
    };
  }

  // Scrape top unique pages via Jina Reader on Medium+ effort
  let scrapedRecords: Record<string, string> = {};
  if (plan.scrapePageCount > 0) {
    const urlsToScrape = uniqueHits
      .slice(0, plan.scrapePageCount)
      .map((h) => h.link)
      .filter(Boolean);

    if (urlsToScrape.length > 0) {
      opts.onProgress?.({
        step: 'scraping',
        message: `Reading ${urlsToScrape.length} source pages via Jina Reader...`,
      });

      const retriever = createParallelRetriever({
        serperKey: serperKey || '',
        jinaKey,
        countryCode,
        languageCode,
      });

      try {
        scrapedRecords = await retriever.parallelScrape(urlsToScrape);
      } catch (err) {
        console.warn('[research-engine] Scraping error:', err);
      }
    }
  }

  // Build authentic Citation objects from real retrieved URLs only
  const citations: Citation[] = uniqueHits.map((hit, index) => {
    const host = extractSourceName(hit.link).toLowerCase();
    const isOfficial =
      host.endsWith('.gov.np') ||
      host.endsWith('.gov') ||
      host.endsWith('.edu.np') ||
      host.endsWith('.edu') ||
      host.endsWith('.org.np') ||
      host.includes('arxiv.org') ||
      host.includes('who.int') ||
      host.includes('worldbank.org') ||
      host.includes('reuters.com') ||
      host.includes('apnews.com');

    let reliabilityScore: number | undefined;
    let reliability: string | undefined;

    if (isOfficial) {
      reliabilityScore = 92;
      reliability = 'High (Official / Institutional)';
    } else if (index < 3) {
      reliabilityScore = 85;
      reliability = 'Verified (Top Search Rank)';
    } else if (index < 8) {
      reliabilityScore = 75;
      reliability = 'Standard (Web Reference)';
    }

    const scrapedContent = scrapedRecords[hit.link];
    const snippet = scrapedContent
      ? scrapedContent.slice(0, 240).replace(/\s+/g, ' ').trim() + '...'
      : hit.snippet || 'Live web research source.';

    return {
      id: `src-${index + 1}`,
      sourceName: extractSourceName(hit.link),
      source: extractSourceName(hit.link),
      title: hit.title || 'Source Reference',
      url: hit.link,
      snippet,
      ...(reliabilityScore !== undefined ? { reliabilityScore } : {}),
      ...(reliability !== undefined ? { reliability } : {}),
    };
  });

  // Construct Markdown grounding context for the model system prompt
  let groundingMarkdown = `### Verified Real-Time Web Research Evidence:\n\n`;
  citations.forEach((c, idx) => {
    const num = idx + 1;
    const scrapedText = scrapedRecords[c.url];
    groundingMarkdown += `[Source ${num}]: "${c.title}"\n`;
    groundingMarkdown += `Publisher / Domain: ${c.sourceName || extractSourceName(c.url)}\n`;
    groundingMarkdown += `URL: ${c.url}\n`;
    groundingMarkdown += `Snippet: ${c.snippet}\n`;
    if (scrapedText) {
      groundingMarkdown += `[Scraped Page Content Extract (Jina Reader)]:\n\`\`\`markdown\n${scrapedText.slice(0, 3500)}\n\`\`\`\n`;
    }
    groundingMarkdown += `\n`;
  });

  return {
    success: true,
    queries,
    hits: uniqueHits,
    scraped: scrapedRecords,
    citations,
    groundingMarkdown,
    effectiveEffort,
    effortCappedNotice,
  };
}
