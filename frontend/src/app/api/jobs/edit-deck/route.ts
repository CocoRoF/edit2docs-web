import { NextRequest, NextResponse } from "next/server";

import {
    authHeaders,
    copyResponseHeaders,
    engineUrl,
} from "@/lib/serverProxy";

/**
 * POST /edit2docs/api/jobs/edit-deck
 *
 * One chat-edit turn on an existing deck. Body forwarded verbatim
 * ({pptx_asset_id, instruction, chat_history, ...}); the BYOK Anthropic
 * key arrives via `X-Anthropic-API-Key` and passes through untouched —
 * same contract as generate-deck.
 */
export async function POST(req: NextRequest) {
    const body = await req.arrayBuffer();

    const upstream = await fetch(engineUrl("/v1/jobs/edit-deck"), {
        method: "POST",
        body,
        headers: {
            ...authHeaders(),
            "Content-Type": req.headers.get("content-type") ?? "application/json",
            "Accept-Language": req.headers.get("accept-language") ?? "ko-KR",
            ...(req.headers.get("x-anthropic-api-key")
                ? { "X-Anthropic-API-Key": req.headers.get("x-anthropic-api-key")! }
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
