import { NextRequest, NextResponse } from "next/server";

import { authHeaders, copyResponseHeaders, engineUrl } from "@/lib/serverProxy";

/**
 * GET /edit2docs/api/assets/[id]/download
 *
 * Streams the file straight through to the browser. We used to 302 to the
 * engine's presigned URL, but that URL points at `/v1/raw/...` which is
 * only reachable from inside the docker network — the browser would get
 * an HTTP 500 from the reverse proxy. Streaming through the Next.js
 * server keeps the byte path inside the docker overlay and lets us
 * preserve the Korean Content-Disposition header that the engine emits.
 *
 * Memory pressure for ~50MB PPTX is acceptable because we use the
 * Response body as a ReadableStream — Next.js doesn't buffer it.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const search = req.nextUrl.searchParams;
    const expires = search.get("expires_in_seconds") ?? "300";

    // 1. Ask the engine for the presigned URL.
    const metaRes = await fetch(
        engineUrl(`/v1/assets/${id}/download?expires_in_seconds=${expires}`),
        {
            method: "GET",
            headers: {
                ...authHeaders(),
                "Accept-Language": req.headers.get("accept-language") ?? "ko-KR",
            },
        },
    );

    if (!metaRes.ok) {
        const text = await metaRes.text();
        return new NextResponse(text, {
            status: metaRes.status,
            headers: { "Content-Type": "application/json" },
        });
    }

    const meta = (await metaRes.json()) as {
        download_url: string;
        expires_in_seconds: number;
        filename: string | null;
        mime_type: string;
    };

    // 2. The engine returns a path-only URL like `/v1/raw/<key>?e=...&s=...`.
    //    Resolve it against the docker-internal engine base so we can fetch
    //    the bytes without going back out through the public proxy.
    const fileRes = await fetch(engineUrl(meta.download_url), {
        method: "GET",
        headers: { ...authHeaders() },
    });

    if (!fileRes.ok || !fileRes.body) {
        const text = await fileRes.text();
        return new NextResponse(text, {
            status: fileRes.status || 502,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 3. Stream the bytes back. Carry over the engine's Content-Disposition
    //    (it already encodes the Korean filename via RFC 5987 filename*=).
    const outHeaders = new Headers();
    copyResponseHeaders(fileRes, outHeaders);
    if (!outHeaders.get("content-disposition") && meta.filename) {
        outHeaders.set(
            "Content-Disposition",
            `attachment; filename*=UTF-8''${encodeURIComponent(meta.filename)}`,
        );
    }
    if (!outHeaders.get("content-type") && meta.mime_type) {
        outHeaders.set("Content-Type", meta.mime_type);
    }

    return new NextResponse(fileRes.body, {
        status: 200,
        headers: outHeaders,
    });
}
