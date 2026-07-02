import { NextRequest, NextResponse } from "next/server";

import {
    authHeaders,
    copyResponseHeaders,
    engineUrl,
} from "@/lib/serverProxy";

/**
 * POST /edit2docs/api/text-edits
 *
 * Direct (no-LLM) text edits from the studio canvas's inline editor.
 * Body: {pptx_asset_id, edits: [{slide, shape_id, para, new_text, old_text}]}.
 * Synchronous — the engine returns the new revision's asset id immediately.
 */
export async function POST(req: NextRequest) {
    const body = await req.arrayBuffer();

    const upstream = await fetch(engineUrl("/v1/text-edits"), {
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
    return new NextResponse(await upstream.arrayBuffer(), {
        status: upstream.status,
        headers: outHeaders,
    });
}
