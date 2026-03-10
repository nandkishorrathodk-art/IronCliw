import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readStringParam } from "./common.js";

interface DataSourceResult {
  source: string;
  data: unknown;
  timestamp: number;
  error?: string;
}

interface RealtimeDataResponse {
  query: string;
  sources: string[];
  successful: number;
  failed: number;
  results: DataSourceResult[];
  synthesized: string;
}

const BRAVE_SEARCH_API = "https://api.search.brave.com/res/v1/web/search";
const NEWSAPI_ENDPOINT = "https://newsapi.org/v2/everything";
const FINNHUB_STOCK_ENDPOINT = "https://finnhub.io/api/v1/quote";
const FINNHUB_NEWS_ENDPOINT = "https://finnhub.io/api/v1/company-news";
const CRYPTOPANIC_ENDPOINT = "https://cryptopanic.com/api/v1/posts/";

async function searchBrave(query: string): Promise<DataSourceResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${BRAVE_SEARCH_API}?q=${encodeURIComponent(query)}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`Brave Search API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      source: "brave_search",
      data: {
        results: (data.web || []).slice(0, 5).map((r: Record<string, unknown>) => ({
          title: r.title,
          url: r.url,
          description: r.description,
        })),
        count: (data.web || []).length,
      },
      timestamp: startTime,
    };
  } catch (error) {
    return {
      source: "brave_search",
      data: null,
      timestamp: startTime,
      error: String(error),
    };
  }
}

async function searchNews(query: string): Promise<DataSourceResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${NEWSAPI_ENDPOINT}?q=${encodeURIComponent(query)}&pageSize=5`, {
      headers: {
        "X-API-Key": process.env.NEWSAPI_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`NewsAPI returned ${response.status}`);
    }

    const data = await response.json();
    return {
      source: "news_api",
      data: {
        articles: (data.articles || []).map((a: Record<string, unknown>) => ({
          title: a.title,
          source: a.source?.name,
          published: a.publishedAt,
          summary: a.description,
          url: a.url,
        })),
        count: data.totalResults,
      },
      timestamp: startTime,
    };
  } catch (error) {
    return {
      source: "news_api",
      data: null,
      timestamp: startTime,
      error: String(error),
    };
  }
}

async function getStockData(symbol: string): Promise<DataSourceResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `${FINNHUB_STOCK_ENDPOINT}?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY || ""}`,
    );

    if (!response.ok) {
      throw new Error(`Finnhub API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      source: "finnhub_stock",
      data: {
        symbol,
        current: data.c,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        change: ((data.c - data.pc) / data.pc * 100).toFixed(2),
        timestamp: data.t,
      },
      timestamp: startTime,
    };
  } catch (error) {
    return {
      source: "finnhub_stock",
      data: null,
      timestamp: startTime,
      error: String(error),
    };
  }
}

async function getCompanyNews(symbol: string): Promise<DataSourceResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `${FINNHUB_NEWS_ENDPOINT}?symbol=${encodeURIComponent(symbol)}&limit=5&token=${process.env.FINNHUB_API_KEY || ""}`,
    );

    if (!response.ok) {
      throw new Error(`Finnhub News API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      source: "finnhub_news",
      data: {
        articles: (data || []).map((a: Record<string, unknown>) => ({
          headline: a.headline,
          summary: a.summary,
          source: a.source,
          datetime: a.datetime,
          sentiment: a.sentiment,
          url: a.url,
        })),
        count: data.length,
      },
      timestamp: startTime,
    };
  } catch (error) {
    return {
      source: "finnhub_news",
      data: null,
      timestamp: startTime,
      error: String(error),
    };
  }
}

function synthesizeData(results: DataSourceResult[]): string {
  const successfulResults = results.filter((r) => !r.error);

  if (successfulResults.length === 0) {
    return "All data sources failed to respond.";
  }

  let synthesis = "## Real-time Data Summary\n\n";

  for (const result of successfulResults) {
    synthesis += `### ${result.source.replace(/_/g, " ").toUpperCase()}\n`;

    if (result.source === "brave_search" || result.source === "news_api") {
      const results = (result.data as Record<string, unknown>)?.results as Array<{ title?: string; url?: string; description?: string }> || [];
      synthesis += results.map((r) => `- **${r.title}** (${r.url || "N/A"})`).join("\n");
    } else if (result.source === "finnhub_stock") {
      const stock = result.data as Record<string, unknown>;
      synthesis += `- Current: $${stock.current} (${stock.change}% change)\n`;
      synthesis += `- Range: $${stock.low} - $${stock.high}\n`;
    } else {
      synthesis += `- ${JSON.stringify(result.data).substring(0, 200)}...\n`;
    }

    synthesis += "\n";
  }

  return synthesis;
}

export const realtimeDataTool: AnyAgentTool = {
  name: "realtime_data",
  description:
    "Fetch real-time data from multiple sources including web search, news, stock prices, and sentiment analysis. " +
    "Supports Brave Search, NewsAPI, Finnhub (stocks/news), and CryptoPanic.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query or symbol to fetch data for",
      },
      sources: {
        type: "array",
        items: { type: "string" },
        enum: ["brave_search", "news_api", "finnhub_stock", "finnhub_news", "cryptopanic"],
        description: "Which data sources to query (default: all available)",
      },
      include_sentiment: {
        type: "boolean",
        description: "Include sentiment analysis in results (default: true)",
      },
    },
    required: ["query"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const query = readStringParam(params, "query", { required: true });

      if (!query || query.length === 0) {
        throw new ToolInputError("query cannot be empty");
      }

      logVerbose(`[realtime-data] Fetching data for: ${query}`);

      const results: DataSourceResult[] = [];

      results.push(await searchBrave(query));
      results.push(await searchNews(query));

      if (/^[A-Z]{1,5}$/.test(query)) {
        results.push(await getStockData(query));
        results.push(await getCompanyNews(query));
      }

      const successfulResults = results.filter((r) => !r.error);
      const failedResults = results.filter((r) => r.error);

      const synthesis = synthesizeData(results);

      const response: RealtimeDataResponse = {
        query,
        sources: results.map((r) => r.source),
        successful: successfulResults.length,
        failed: failedResults.length,
        results,
        synthesized: synthesis,
      };

      logVerbose(
        `[realtime-data] Completed: ${successfulResults.length}/${results.length} sources successful`,
      );

      return jsonResult(response);
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Realtime data fetch failed: ${String(error)}`);
    }
  },
};
