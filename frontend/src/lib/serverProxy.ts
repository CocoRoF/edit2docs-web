/**
 * Server-side helper to proxy requests from Next.js route handlers to
 * `edit2docs-server` over the docker-internal network.
 *
 * Two env vars come from the compose definition (W1):
 *   EDIT2DOCS_SERVER_INTERNAL_URL  e.g. "http://edit2docs-server:8000"
 *   EDIT2DOCS_SERVER_API_KEY       Bearer token the engine expects
 *
 * Anthropic / OpenAI BYOK keys are NEVER persisted server-side. They flow
 * through verbatim from the browser via X-* headers; the helper picks them
 * off the inbound request and forwards them to the engine.
 */

import type { NextRequest } from "next/server";

const INTERNAL_URL =
    process.env.EDIT2DOCS_SERVER_INTERNAL_URL ?? "http://edit2docs-server:8000";
const SERVER_API_KEY = process.env.EDIT2DOCS_SERVER_API_KEY ?? "";

/** Headers that *may* arrive from the browser and should be forwarded if present. */
const PASSTHROUGH_REQUEST_HEADERS = [
    "accept",
    "accept-language",
    "content-type",
    "x-anthropic-api-key",
    "x-openai-api-key",
    "x-pexels-api-key",
    "x-pixabay-api-key",
];

/** Headers from the engine response we want the browser to see. */
const PASSTHROUGH_RESPONSE_HEADERS = [
    "content-type",
    "content-disposition", // Korean filenames via RFC 5987 — critical
    "cache-control",
];

export function engineUrl(path: string): string {
    if (!path.startsWith("/")) path = `/${path}`;
    return `${INTERNAL_URL}${path}`;
}

export function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (SERVER_API_KEY) h.Authorization = `Bearer ${SERVER_API_KEY}`;
    return h;
}

export function buildProxyHeaders(req: NextRequest): Headers {
    const out = new Headers();
    out.set("Authorization", `Bearer ${SERVER_API_KEY}`);
    for (const name of PASSTHROUGH_REQUEST_HEADERS) {
        const value = req.headers.get(name);
        if (value !== null) out.set(name, value);
    }
    return out;
}

export function copyResponseHeaders(from: Response, to: Headers): void {
    for (const name of PASSTHROUGH_RESPONSE_HEADERS) {
        const value = from.headers.get(name);
        if (value !== null) to.set(name, value);
    }
}
