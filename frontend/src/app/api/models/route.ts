import { NextRequest, NextResponse } from "next/server";

import { authHeaders, engineUrl } from "@/lib/serverProxy";

/**
 * GET /edit2docs/api/models
 *
 * Proxies the engine's `GET /v1/models`, which serves the model picker
 * live: with the browser's BYOK Anthropic key (forwarded via
 * `X-Anthropic-API-Key`) the engine returns the models that key can use;
 * without a key, a curated fallback list. The key is pass-through only —
 * never persisted here.
 */
export async function GET(req: NextRequest) {
    const key = req.headers.get("x-anthropic-api-key");
    try {
        const upstream = await fetch(engineUrl("/v1/models"), {
            method: "GET",
            headers: {
                ...authHeaders(),
                Accept: "application/json",
                ...(key ? { "X-Anthropic-API-Key": key } : {}),
            },
            // Model list is small and cheap; don't cache per-key on the edge.
            cache: "no-store",
        });
        const body = await upstream.text();
        return new NextResponse(body, {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch {
        // Engine unreachable — return a minimal client-side fallback so the
        // dropdown still renders.
        return NextResponse.json({
            models: [
                { id: "claude-opus-4-7", display_name: "Claude Opus 4.7" },
                { id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" },
            ],
            default: "claude-opus-4-7",
            source: "fallback",
        });
    }
}
