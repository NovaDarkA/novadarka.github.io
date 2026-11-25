import { json, route } from "../src/lib/http.ts";
export default {
  fetch: route({ GET: () => json({ status: "ok", service: "shoefit-api" }) })
};
