import EngineStatusNote from "./EngineStatusNote";

/**
 * Site-wide footer. Shows engine build info pulled at request time from
 * the engine's /health endpoint via /edit2docs-api proxy. Server component
 * so the request happens at render time, not in the browser; only the
 * localized failure note is a client component (it needs the locale).
 */
async function fetchEngineHealth(): Promise<
    | { commit: string; built_at: string; ok: true }
    | { ok: false; reason: string }
> {
    const url = process.env.EDIT2DOCS_SERVER_INTERNAL_URL
        ? `${process.env.EDIT2DOCS_SERVER_INTERNAL_URL}/health`
        : null;
    if (!url) return { ok: false, reason: "no EDIT2DOCS_SERVER_INTERNAL_URL" };
    try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
        const body = (await r.json()) as {
            status?: string;
            commit?: string;
            built_at?: string;
        };
        return {
            ok: true,
            commit: body.commit ?? "unknown",
            built_at: body.built_at ?? "unknown",
        };
    } catch (err) {
        return { ok: false, reason: String(err) };
    }
}

export default async function SiteFooter() {
    const health = await fetchEngineHealth();
    return (
        <footer className="border-t border-neutral-200 bg-neutral-50/50 mt-16">
            <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-3">
                <p>
                    Built on{" "}
                    <a
                        href="https://github.com/CocoRoF/edit2docs"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-neutral-700"
                    >
                        edit2docs
                    </a>{" "}
                    (MIT). Forked from{" "}
                    <a
                        href="https://github.com/hugohe3/ppt-master"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-neutral-700"
                    >
                        ppt-master
                    </a>{" "}
                    by Hugo He.
                </p>
                {health.ok ? (
                    <p className="font-mono">
                        engine commit {health.commit.slice(0, 8)} · built {health.built_at}
                    </p>
                ) : (
                    <EngineStatusNote reason={health.reason} />
                )}
            </div>
        </footer>
    );
}
