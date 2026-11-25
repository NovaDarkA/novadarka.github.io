import test from "node:test";
import assert from "node:assert/strict";
import health from "../api/health.ts";
import { readSupabaseConfig } from "../src/config/env.js";
import { route, HttpError } from "../src/lib/http.js";
import { createSupabaseTransport } from "../src/services/supabase.ts";

const config = { url: "https://shoefit.supabase.co", publishableKey: "sb_publishable_test" };
const req = (method = "GET") => new Request("https://shoefit.example/api/health", { method });

test("health reports API only and includes security headers", async () => {
  const res = await health.fetch(req());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", service: "shoefit-api" });
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.ok(res.headers.get("x-request-id"));
});
test("unsupported methods return 405", async () => {
  const res = await health.fetch(req("POST"));
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("allow"), "GET");
});
test("unexpected errors do not leak private details", async () => {
  const res = await route({ GET: () => { throw new Error("private credential"); } })(req());
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "internal_error" });
});
test("known errors retain status", async () => {
  const res = await route({ GET: () => { throw new HttpError(403, "forbidden"); } })(req());
  assert.equal(res.status, 403);
});
test("valid configuration", () => {
  assert.deepEqual(readSupabaseConfig({ SUPABASE_URL: config.url, SUPABASE_PUBLISHABLE_KEY: config.publishableKey }), config);
});
test("missing or unsafe configuration is rejected", () => {
  assert.throws(() => readSupabaseConfig({}));
  assert.throws(() => readSupabaseConfig({ SUPABASE_URL: "http://shoefit.supabase.co", SUPABASE_PUBLISHABLE_KEY: config.publishableKey }));
  assert.throws(() => readSupabaseConfig({ SUPABASE_URL: config.url, SUPABASE_PUBLISHABLE_KEY: "sb_secret_test" }));
});
test("transport preserves user JWT and uses publishable key", async () => {
  const request = createSupabaseTransport(config, async (url, options) => {
    assert.equal(String(url), config.url + "/rest/v1/products");
    assert.equal(options.headers.get("apikey"), config.publishableKey);
    assert.equal(options.headers.get("authorization"), "Bearer user-token");
    assert.equal(options.redirect, "error");
    return new Response("[]");
  });
  assert.equal((await request("/rest/v1/products", {}, "user-token")).status, 200);
});
test("anonymous transport does not forward arbitrary authorization", async () => {
  const request = createSupabaseTransport(config, async (_, options) => {
    assert.equal(options.headers.get("authorization"), null);
    return new Response("[]");
  });
  await request("/rest/v1/products", { headers: { authorization: "Bearer unexpected" } });
});
test("transport rejects path traversal and external hosts", async () => {
  const request = createSupabaseTransport(config, async () => { throw new Error("must not call"); });
  await assert.rejects(request("//evil.example/rest/v1/products"), { code: "invalid_upstream_path" });
  await assert.rejects(request("/rest/v1/../../private"), { code: "invalid_upstream_path" });
});
test("transport masks network errors", async () => {
  const request = createSupabaseTransport(config, async () => { throw new Error("private details"); });
  await assert.rejects(request("/rest/v1/products"), { code: "upstream_unavailable" });
});
