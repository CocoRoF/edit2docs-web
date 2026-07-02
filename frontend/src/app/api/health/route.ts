import { NextResponse } from "next/server";

/**
 * Liveness probe. Used by docker-compose's healthcheck.
 *
 * Returns the build-info recorded by the Dockerfile (commit SHA + build
 * timestamp) so we can verify the deployed container matches the expected
 * upstream commit — same pattern as Edit2me.
 */
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "edit2docs-web",
        version: process.env.npm_package_version ?? "0.0.0",
        commit: process.env.EDIT2DOCS_WEB_GIT_SHA ?? "unknown",
        builtAt: process.env.EDIT2DOCS_WEB_BUILT_AT ?? "unknown",
        runtime: "nodejs",
    });
}
