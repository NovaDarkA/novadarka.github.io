import { json, route } from "../src/lib/http.js";
export default {
  fetch: route({ GET: () => json({ status: "ok", service: "shoefit-api" }) })
};
