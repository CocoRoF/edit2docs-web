import { NextRequest, NextResponse } from "next/server";

import {
    authHeaders,
    copyResponseHeaders,
    engineUrl,
} from "@/lib/serverProxy";

/**
 * POST /edit2docs/api/jobs/generate-deck
 *
 * Body forwarded verbatim to the engine. The browser's BYOK Anthropic
 * key arrives via `X-Anthropic-API-Key`; optional image keys via
 * `X-OpenAI-API-Key` / `X-Pexels-API-Key` / `X-Pixabay-API-Key`.
 *
 * The engine persists these headers ONLY on the resulting Job row's
 * `params.anthropic_api_key` field (so the worker can replay them), and
 * never echoes the keys back to the frontend (the engine redacts them
 * on read). The web proxy never touches the key contents — pure pass-through.
 */
export async function POST(req: NextRequest) {
    const body = await req.arrayBuffer();

    const upstream = await fetch(engineUrl("/v1/jobs/generate-deck"), {
        method: "POST",
        body,
        headers: {
            ...authHeaders(),
            "Content-Type": req.headers.get("content-type") ?? "application/json",
            "Accept-Language": req.headers.get("accept-language") ?? "ko-KR",
            ...(req.headers.get("x-anthropic-api-key")
                ? { "X-Anthropic-API-Key": req.headers.get("x-anthropic-api-key")! }
                : {}),
            ...(req.headers.get("x-openai-api-key")
                ? { "X-OpenAI-API-Key": req.headers.get("x-openai-api-key")! }
                : {}),
            ...(req.headers.get("x-pexels-api-key")
                ? { "X-Pexels-API-Key": req.headers.get("x-pexels-api-key")! }
                : {}),
        },
    });

    const outHeaders = new Headers();
    copyResponseHeaders(upstream, outHeaders);
    return new NextResponse(await upstream.arrayBuffer(), {
        status: upstream.status,
        headers: outHeaders,
    });
}
