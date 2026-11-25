import { readSupabaseConfig, type SupabaseConfig } from "../config/env.ts";
import { HttpError } from "../lib/http.ts";

// Requests use the caller's JWT, so database RLS remains authoritative.
export function createSupabaseTransport(config: SupabaseConfig = readSupabaseConfig(), transport: typeof fetch = fetch) {
  return async function request(path: string, options: RequestInit = {}, accessToken?: string): Promise<Response> {
    if (!/^\/(rest|auth)\/v1\//.test(path)) throw new HttpError(400, "invalid_upstream_path");
    const url = new URL(path, config.url);
    if (url.origin !== config.url || !/^\/(rest|auth)\/v1\//.test(url.pathname)) {
      throw new HttpError(400, "invalid_upstream_path");
    }
    const headers = new Headers(options.headers);
    headers.delete("authorization");
    headers.set("apikey", config.publishableKey);
    if (accessToken) headers.set("Authorization", "Bearer " + accessToken);
    try {
      return await transport(url, { ...options, headers, redirect: "error", signal: AbortSignal.timeout(8000) });
    } catch {
      throw new HttpError(503, "upstream_unavailable");
    }
  };
}
