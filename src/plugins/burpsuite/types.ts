/**
 * Burp Suite REST API Data Structures
 */

export type BurpApiConfig = {
  baseUrl: string;
  apiKey: string;
};

export type BurpHttpRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string; // Base64 encoded or raw string depending on API
};

export type BurpHttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body?: string;
};

export type BurpProxyItem = {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  request: string; // Base64 encoded raw request
  response?: string; // Base64 encoded raw response
  time: string;
};

export type BurpScanIssue = {
  id: string;
  name: string;
  severity: "High" | "Medium" | "Low" | "Information";
  confidence: "Certain" | "Firm" | "Tentative";
  description: string;
  remediation?: string;
  url: string;
  path: string;
  requestResponse: Array<{
    request: string;
    response: string;
  }>;
};

export type BurpScanTask = {
  id: string;
  status: "running" | "paused" | "succeeded" | "failed";
  progress: number;
  issuesCount: number;
};

export type BurpFireRequestResult = {
  response: string;
  statusCode: number;
  responseLength: number;
  responseTime: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
};
