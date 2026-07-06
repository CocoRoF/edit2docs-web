"use client";

import { Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import QualityIssueList from "@/components/QualityIssueList";
import { withBase } from "@/lib/basePath";
import { localeTag, useLocale, useT } from "@/lib/i18n";
import type { JobResponse } from "@/lib/api";

/**
 * Job result view.
 *
 * Polls the job until it reaches a terminal status, then renders:
 *  - localized status banner
 *  - download button (preserves the original — possibly Korean — filename
 *    via the engine's presigned URL's Content-Disposition)
 *  - design_spec markdown viewer
 *  - spec_lock YAML viewer
 *  - quality issues list
 *  - cost / token summary
 */
export default function JobPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const t = useT();
    const { locale } = useLocale();
    const [id, setId] = useState<string | null>(null);
    const [job, setJob] = useState<JobResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void params.then((p) => setId(p.id));
    }, [params]);

    const fetchJob = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(withBase(`/api/jobs/${id}`), {
                headers: { "Accept-Language": localeTag(locale) },
                cache: "no-store",
            });
            if (!res.ok) {
                setError(t.job.fetchFailed(res.status));
                return;
            }
            const j = (await res.json()) as JobResponse;
            setJob(j);
            setError(null);
        } catch (err) {
            setError(
                t.job.fetchError(err instanceof Error ? err.message : String(err)),
            );
        }
    }, [id, locale, t]);

    const terminal =
        job?.status === "done" ||
        job?.status === "failed" ||
        job?.status === "cancelled";

    useEffect(() => {
        if (!id || terminal) return;
        void fetchJob();
        // Poll every 2s while the job is non-terminal; the effect re-runs
        // (and skips scheduling) once a terminal status lands.
        const t = setInterval(() => {
            void fetchJob();
        }, 2_000);
        return () => clearInterval(t);
    }, [id, fetchJob, terminal]);

    return (
        <main className="flex-1 flex flex-col items-center px-6 py-12 max-w-5xl mx-auto w-full">
            <header className="w-full flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">
                        {t.job.title}
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        job id{" "}
                        <code className="font-mono text-xs">
                            {id ?? "…"}
                        </code>
                    </p>
                </div>
                <Link
                    href="/generate"
                    className="text-sm text-primary-700 hover:text-primary-800"
                >
                    {t.job.newJob}
                </Link>
            </header>

            {error && (
                <p className="mt-6 w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </p>
            )}

            {!job && !error && (
                <p className="mt-12 inline-flex items-center gap-2 text-neutral-500">
                    <RefreshCw className="size-4 animate-spin" />
                    {t.job.loading}
                </p>
            )}

            {job && (
                <section className="mt-8 w-full space-y-6">
                    <StatusBanner job={job} />
                    {job.status === "done" &&
                        (job.result.doc_asset_id ?? job.result.pptx_asset_id) && (
                        <DownloadCard
                            assetId={
                                job.result.doc_asset_id ?? job.result.pptx_asset_id!
                            }
                            pageCount={job.result.page_count ?? 0}
                            format={job.result.format ?? "pptx"}
                        />
                    )}
                    {job.result.quality_issues &&
                        job.result.quality_issues.length > 0 && (
                            <QualityIssueList
                                issues={job.result.quality_issues}
                            />
                        )}
                    {job.result.design_spec && (
                        <DesignSpec
                            text={job.result.design_spec}
                            langs={job.result.detected_langs ?? []}
                        />
                    )}
                    {job.result.spec_lock && (
                        <SpecLockBlock text={job.result.spec_lock} />
                    )}
                    <CostSummary cost={job.cost} />
                </section>
            )}
        </main>
    );
}

function StatusBanner({ job }: { job: JobResponse }) {
    const t = useT();
    const statusLabel =
        (t.status as Record<string, string>)[job.status] ?? job.status;

    const style = (() => {
        switch (job.status) {
            case "done":
                return "border-emerald-200 bg-emerald-50";
            case "failed":
            case "cancelled":
                return "border-red-200 bg-red-50";
            default:
                return "border-amber-200 bg-amber-50";
        }
    })();

    return (
        <div className={`rounded-xl border ${style} px-5 py-4`}>
            <p className="font-semibold text-neutral-900">
                {t.job.statusLabel} — {statusLabel}
            </p>
            {job.error_message && (
                <p className="mt-2 text-sm text-red-700">
                    {t.job.errorMessage} {job.error_message}
                </p>
            )}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Field label={t.job.langField} value={String(job.params.lang ?? "—")} />
                <Field label={t.job.styleField} value={String(job.params.style ?? "general")} />
                <Field
                    label={t.job.pagesField}
                    value={
                        job.result.format && job.result.format !== "pptx"
                            ? "—"
                            : String(job.result.page_count ?? "—")
                    }
                />
                <Field
                    label={t.job.durationField}
                    value={t.job.seconds(
                        Math.round(Number(job.cost.duration_seconds ?? 0)),
                    )}
                />
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-neutral-500">{label}</p>
            <p className="mt-0.5 font-medium text-neutral-900 truncate">{value}</p>
        </div>
    );
}

const FORMAT_LABEL: Record<string, string> = {
    pptx: "PPTX",
    docx: "Word (DOCX)",
    xlsx: "Excel (XLSX)",
};

function DownloadCard({
    assetId,
    pageCount,
    format,
}: {
    assetId: string;
    pageCount: number;
    format: string;
}) {
    const t = useT();
    const label = FORMAT_LABEL[format] ?? format.toUpperCase();
    return (
        <div className="rounded-xl border border-primary-200 bg-primary-50/40 px-5 py-5">
            <h2 className="font-semibold text-neutral-900">
                {t.job.downloadTitle(label)}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
                {format === "pptx" && pageCount > 0
                    ? t.job.downloadHintPages(pageCount)
                    : t.job.downloadHint}
            </p>
            <a
                href={withBase(`/api/assets/${assetId}/download`)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
                <Download className="size-4" />
                {t.job.downloadCta(label)}
            </a>
        </div>
    );
}

function DesignSpec({
    text,
    langs,
}: {
    text: string;
    langs: string[];
}) {
    const t = useT();
    return (
        <details className="rounded-xl border border-neutral-200 px-5 py-4">
            <summary className="cursor-pointer font-semibold text-neutral-900 select-none">
                {t.job.designSpec}
                {langs.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                        {t.job.detectedLangs} {langs.join(", ")}
                    </span>
                )}
            </summary>
            <pre className="mt-4 text-xs whitespace-pre-wrap font-mono leading-relaxed text-neutral-700 max-h-[500px] overflow-y-auto">
                {text}
            </pre>
        </details>
    );
}

function SpecLockBlock({ text }: { text: string }) {
    const t = useT();
    return (
        <details className="rounded-xl border border-neutral-200 px-5 py-4">
            <summary className="cursor-pointer font-semibold text-neutral-900 select-none">
                {t.job.specLock}
            </summary>
            <pre className="mt-4 text-xs font-mono leading-relaxed text-neutral-700 max-h-[500px] overflow-y-auto bg-neutral-50 rounded-md p-3">
                {text}
            </pre>
        </details>
    );
}

function CostSummary({ cost }: { cost: Record<string, number> }) {
    const t = useT();
    const rows: [string, string][] = [
        [t.job.costInputTokens, String(cost.input_tokens ?? 0)],
        [t.job.costOutputTokens, String(cost.output_tokens ?? 0)],
        [t.job.costCacheRead, String(cost.cache_read_tokens ?? 0)],
        [t.job.costCacheWrite, String(cost.cache_write_tokens ?? 0)],
        [t.job.costImages, String(cost.image_count ?? 0)],
        [t.job.costAudioSeconds, (cost.audio_seconds ?? 0).toFixed(1)],
        [t.job.costWallSeconds, (cost.duration_seconds ?? 0).toFixed(1)],
    ];
    return (
        <details className="rounded-xl border border-neutral-200 px-5 py-4">
            <summary className="cursor-pointer font-semibold text-neutral-900 select-none">
                {t.job.costTitle}
            </summary>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {rows.map(([k, v]) => (
                    <div key={k}>
                        <dt className="text-neutral-500">{k}</dt>
                        <dd className="mt-0.5 font-medium text-neutral-900">{v}</dd>
                    </div>
                ))}
            </dl>
        </details>
    );
}
