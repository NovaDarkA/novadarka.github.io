import { json, route } from "../src/lib/http.js";
import { createSupabaseTransport } from "../src/services/supabase-transport.js";
import { readCatalog } from "../src/services/catalog.js";

export default { fetch: route({
  GET: async () => json({ data: await readCatalog(createSupabaseTransport()) })
}) };
