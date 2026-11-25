export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const result = new Headers(headers);
  result.set("Cache-Control", "no-store");
  result.set("X-Content-Type-Options", "nosniff");
  result.set("Referrer-Policy", "no-referrer");
  return Response.json(data, { status, headers: result });
}

type Handler = (request: Request) => Response | Promise<Response>;

export function route(methods: Readonly<Record<string, Handler>>) {
  return async (request: Request): Promise<Response> => {
    const id = crypto.randomUUID();
    let response: Response;
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
