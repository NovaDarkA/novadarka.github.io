import { readSupabaseConfig } from "../config/env.js";
import { HttpError } from "../lib/http.js";

/** @param {import("../config/env.js").SupabaseConfig} [config] @param {typeof fetch} [transport] */
export function createSupabaseTransport(config = readSupabaseConfig(), transport = fetch) {
  return async function request(/** @type {string} */ path, /** @type {RequestInit} */ options = {}, /** @type {string | undefined} */ accessToken = undefined) {
    if (!/^\/(rest|auth)\/v1\//.test(path)) throw new HttpError(400, "invalid_upstream_path");
    const url = new URL(path, config.url);
    if (url.origin !== config.url || !/^\/(rest|auth)\/v1\//.test(url.pathname)) throw new HttpError(400, "invalid_upstream_path");
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
