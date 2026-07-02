import { NextRequest, NextResponse } from "next/server";

import {
    authHeaders,
    copyResponseHeaders,
    engineUrl,
} from "@/lib/serverProxy";

/**
 * POST /edit2docs/api/preview
 *
 * Body: {pptx_asset_id}. The engine renders every slide of the deck to a
 * self-contained SVG (deterministic, no LLM) — the studio canvas displays
 * them directly. Responses can be several MB for image-heavy decks, so
 * this handler streams the engine response through without buffering
 * transforms.
 */
export async function POST(req: NextRequest) {
    const body = await req.arrayBuffer();

    const upstream = await fetch(engineUrl("/v1/preview"), {
        method: "POST",
        body,
        headers: {
            ...authHeaders(),
            "Content-Type": req.headers.get("content-type") ?? "application/json",
            "Accept-Language": req.headers.get("accept-language") ?? "ko-KR",
        },
    });

    const outHeaders = new Headers();
    copyResponseHeaders(upstream, outHeaders);
    return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: outHeaders,
    });
}
