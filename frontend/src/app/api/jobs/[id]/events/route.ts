import { NextRequest } from "next/server";

import { authHeaders, engineUrl } from "@/lib/serverProxy";

/**
 * GET /edit2docs/api/jobs/[id]/events
 *
 * SSE proxy. The upstream is the engine's
 *     GET /v1/jobs/{id}/events
 * which yields `text/event-stream` and may stay open for minutes.
 *
 * We stream the upstream body straight to the browser. Cancellation flows
 * through the AbortSignal so closing the browser tab tears down the
 * engine-side connection too.
 */
export const runtime = "nodejs"; // ensure streaming + AbortController are available

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const search = req.nextUrl.search;
    const upstream = await fetch(
        engineUrl(`/v1/jobs/${id}/events${search}`),
        {
            method: "GET",
            headers: {
                ...authHeaders(),
                "Accept-Language": req.headers.get("accept-language") ?? "ko-KR",
                Accept: "text/event-stream",
            },
            signal: req.signal,
        },
    );

    return new Response(upstream.body, {
        status: upstream.status,
        headers: {
            "Content-Type":
                upstream.headers.get("content-type") ?? "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            // Helpful when the chain is nginx → Next.js → engine — keeps
            // events flowing without the intermediate buffering them up.
            "X-Accel-Buffering": "no",
        },
    });
}
