import type { NextConfig } from "next";

/**
 * edit2docs-web Next.js config.
 *
 * Served at `${basePath}` by hr_blog2.0's nginx. The default basePath
 * (`/edit2docs`) matches the nginx upstream block. To run this app standalone
 * (without basePath) set NEXT_PUBLIC_BASE_PATH="" in the dev environment.
 */
const config: NextConfig = {
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/edit2docs",
    reactStrictMode: true,
    experimental: {
        serverActions: {
            // PDF/DOCX/PPTX uploads can be tens of MB. We accept up to 210MB at
            // the action boundary; nginx caps at 200MB so anything bigger is
            // rejected upstream anyway.
            bodySizeLimit: "210mb",
        },
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Separate `npm run typecheck` step runs tsc; build doesn't redo it.
        ignoreBuildErrors: false,
    },
    // Helpful when running behind nginx — Next.js produces absolute URLs that
    // already include the basePath.
    trailingSlash: false,
};

export default config;
