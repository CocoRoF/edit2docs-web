/**
 * Resolve the deployed basePath at runtime.
 *
 * Next.js's `basePath` config silently rewrites `next/link` URLs and asset
 * paths, but anything we construct manually (fetch URLs, redirect targets)
 * needs to know the prefix too. `NEXT_PUBLIC_BASE_PATH` is set in
 * docker-compose for both build- and runtime-side use.
 */
export const BASE_PATH =
    process.env.NEXT_PUBLIC_BASE_PATH ?? "/edit2docs";

/** Build a path under the app's basePath. */
export function withBase(path: string): string {
    if (!path.startsWith("/")) {
        path = `/${path}`;
    }
    return `${BASE_PATH}${path}`;
}
