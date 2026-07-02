import { NextRequest, NextResponse } from "next/server";

import {
    authHeaders,
    copyResponseHeaders,
    engineUrl,
} from "@/lib/serverProxy";

/**
 * GET /edit2docs/api/jobs/[id] — job status / result snapshot.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const upstream = await fetch(engineUrl(`/v1/jobs/${id}`), {
        headers: {
            ...authHeaders(),
            "Accept-Language": req.headers.get("accept-language") ?? "ko-KR",
        },
    });

    const headers = new Headers();
    copyResponseHeaders(upstream, headers);
    return new NextResponse(await upstream.arrayBuffer(), {
        status: upstream.status,
        headers,
    });
}
