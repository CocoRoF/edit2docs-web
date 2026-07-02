import { NextRequest, NextResponse } from "next/server";

import {
    authHeaders,
    copyResponseHeaders,
    engineUrl,
} from "@/lib/serverProxy";

/**
 * POST /edit2docs/api/upload
 *
 * Accepts a multipart form with a `file` field. Forwards verbatim to the
 * engine's `POST /v1/assets` and returns the engine's JSON response.
 *
 * Korean filenames flow through unchanged: the browser sets the file's
 * .name (which may be Korean), the FormData we re-build keeps that name,
 * and the engine records it on `assets.original_filename`. The engine's
 * storage_key is always ASCII (Track A).
 */
export async function POST(req: NextRequest) {
    let inboundForm: FormData;
    try {
        inboundForm = await req.formData();
    } catch (err) {
        return NextResponse.json(
            {
                error: {
                    code: "BAD_REQUEST",
                    message: "multipart form 데이터를 읽을 수 없습니다.",
                    message_en: "Could not parse multipart form data.",
                    detail: String(err),
                },
            },
            { status: 400 },
        );
    }

    const file = inboundForm.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json(
            {
                error: {
                    code: "MISSING_FILE",
                    message: "파일이 누락되었습니다.",
                    message_en: "No file in upload.",
                },
            },
            { status: 400 },
        );
    }

    // Re-build the form so we control field order and what gets forwarded.
    const outForm = new FormData();
    outForm.set("file", file, file.name); // file.name may be Korean — pass through
    const kind = inboundForm.get("kind");
    if (typeof kind === "string" && kind.length > 0) {
        outForm.set("kind", kind);
    }

    const acceptLanguage = req.headers.get("accept-language") ?? "ko-KR";

    const response = await fetch(engineUrl("/v1/assets"), {
        method: "POST",
        body: outForm,
        headers: {
            ...authHeaders(),
            "Accept-Language": acceptLanguage,
            // Don't set Content-Type — fetch fills it in with the correct
            // multipart boundary derived from outForm.
        },
    });

    const outHeaders = new Headers();
    copyResponseHeaders(response, outHeaders);
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
        status: response.status,
        headers: outHeaders,
    });
}
