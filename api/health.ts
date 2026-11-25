export default {
  fetch(request: Request): Response {
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { ...headers, Allow: "GET" } });
    }
    return Response.json({ status: "ok", service: "shoefit-api" }, { headers });
  }
};
