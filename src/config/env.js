/** @typedef {{url: string, publishableKey: string}} SupabaseConfig */
const node = /** @type {{process: {env: Record<string, string | undefined>}}} */ (/** @type {unknown} */ (globalThis));

/** @param {Record<string, string | undefined>} [env] @returns {SupabaseConfig} */
export function readSupabaseConfig(env = node.process.env) {
  const raw = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!raw || !key) throw new Error("Supabase configuration missing");
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash ||
      url.pathname !== "/" || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname)) {
    throw new Error("Invalid Supabase project URL");
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error("Expected a Supabase publishable key");
  return { url: url.origin, publishableKey: key };
}
