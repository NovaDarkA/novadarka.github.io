export class HttpError extends Error {
  /** @param {number} status @param {string} code */
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/** @param {unknown} data @param {number} [status] @param {HeadersInit} [headers] @returns {Response} */
export function json(data, status = 200, headers = {}) {
  const result = new Headers(headers);
  result.set("Cache-Control", "no-store");
  result.set("X-Content-Type-Options", "nosniff");
  result.set("Referrer-Policy", "no-referrer");
  return Response.json(data, { status, headers: result });
}

/** @typedef {(request: Request) => Response | Promise<Response>} Handler */

/** @param {Readonly<Record<string, Handler>>} methods */
export function route(methods) {
  return async (/** @type {Request} */ request) => {
    const id = crypto.randomUUID();
    /** @type {Response} */
    let response;
    try {
      const handler = Object.hasOwn(methods, request.method) ? methods[request.method] : undefined;
      response = handler
        ? await handler(request)
        : json({ error: "method_not_allowed" }, 405, { Allow: Object.keys(methods).join(", ") });
    } catch (error) {
      response = error instanceof HttpError
        ? json({ error: error.code }, error.status)
        : json({ error: "internal_error" }, 500);
    }
    response.headers.set("X-Request-Id", id);
    if (response.status >= 500) console.error(JSON.stringify({ level: "error", requestId: id, status: response.status }));
    return response;
  };
}
