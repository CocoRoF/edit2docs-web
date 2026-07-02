"use client";

import { Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import QualityIssueList from "@/components/QualityIssueList";
import { withBase } from "@/lib/basePath";
import type { JobResponse } from "@/lib/api";

/**
 * Job result view.
 *
 * Polls the job until it reaches a terminal status, then renders:
 *  - Korean-friendly status banner
 *  - PPTX download button (preserves the Korean filename via the engine's
 *    presigned URL's Content-Disposition)
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
                headers: { "Accept-Language": "ko-KR" },
                cache: "no-store",
            });
            if (!res.ok) {
                setError(`작업 조회 실패: HTTP ${res.status}`);
                return;
            }
            const j = (await res.json()) as JobResponse;
            setJob(j);
            setError(null);
        } catch (err) {
            setError(`작업 조회 중 오류: ${err instanceof Error ? err.message : String(err)}`);
        }
    }, [id]);

    useEffect(() => {
        if (!id) return;
        void fetchJob();
        // Poll every 2s while the job is non-terminal.
        const t = setInterval(() => {
            void fetchJob();
        }, 2_000);
        return () => clearInterval(t);
    }, [id, fetchJob]);

    useEffect(() => {
        if (!job) return;
        if (
            job.status === "done" ||
            job.status === "failed" ||
            job.status === "cancelled"
        ) {
            // No more polling needed — the next render cycle's interval will
            // clear naturally as the job stops changing.
        }
    }, [job]);

    return (
        <main className="flex-1 flex flex-col items-center px-6 py-12 max-w-5xl mx-auto w-full">
            <header className="w-full flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">
                        작업 결과
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
                    + 새 작업
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
                    작업 정보를 불러오는 중…
                </p>
            )}

            {job && (
                <section className="mt-8 w-full space-y-6">
                    <StatusBanner job={job} />
                    {job.status === "done" && job.result.pptx_asset_id && (
                        <DownloadCard
                            assetId={job.result.pptx_asset_id}
                            pageCount={job.result.page_count ?? 0}
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
    const KOREAN_STATUS: Record<string, string> = {
        queued: "대기 중",
        running: "진행 중",
        done: "완료",
        failed: "실패",
        cancelled: "취소됨",
    };

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
                상태 — {KOREAN_STATUS[job.status] ?? job.status}
            </p>
            {job.error_message && (
                <p className="mt-2 text-sm text-red-700">
                    오류 메시지: {job.error_message}
                </p>
            )}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Field label="언어" value={String(job.params.lang ?? "ko-KR")} />
                <Field label="스타일" value={String(job.params.style ?? "general")} />
                <Field label="페이지 수" value={String(job.result.page_count ?? "—")} />
                <Field
                    label="생성 시간"
                    value={`${Math.round(Number(job.cost.duration_seconds ?? 0))}초`}
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

function DownloadCard({
    assetId,
    pageCount,
}: {
    assetId: string;
    pageCount: number;
}) {
    return (
        <div className="rounded-xl border border-primary-200 bg-primary-50/40 px-5 py-5">
            <h2 className="font-semibold text-neutral-900">📥 PPTX 다운로드</h2>
            <p className="mt-1 text-sm text-neutral-600">
                {pageCount}페이지 — 한글 파일명이 그대로 보존됩니다.
            </p>
            <a
                href={withBase(`/api/assets/${assetId}/download`)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
                <Download className="size-4" />
                PPTX 받기
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
    return (
        <details className="rounded-xl border border-neutral-200 px-5 py-4">
            <summary className="cursor-pointer font-semibold text-neutral-900 select-none">
                Strategist 디자인 스펙
                {langs.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                        감지 언어: {langs.join(", ")}
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
    return (
        <details className="rounded-xl border border-neutral-200 px-5 py-4">
            <summary className="cursor-pointer font-semibold text-neutral-900 select-none">
                spec_lock.yaml (실행 계약)
            </summary>
            <pre className="mt-4 text-xs font-mono leading-relaxed text-neutral-700 max-h-[500px] overflow-y-auto bg-neutral-50 rounded-md p-3">
                {text}
            </pre>
        </details>
    );
}

function CostSummary({ cost }: { cost: Record<string, number> }) {
    const rows: [string, string][] = [
        ["입력 토큰", String(cost.input_tokens ?? 0)],
        ["출력 토큰", String(cost.output_tokens ?? 0)],
        ["캐시 읽기 토큰", String(cost.cache_read_tokens ?? 0)],
        ["캐시 쓰기 토큰", String(cost.cache_write_tokens ?? 0)],
        ["이미지 수", String(cost.image_count ?? 0)],
        [
            "오디오 합성 (초)",
            (cost.audio_seconds ?? 0).toFixed(1),
        ],
        ["벽시계 (초)", (cost.duration_seconds ?? 0).toFixed(1)],
    ];
    return (
        <details className="rounded-xl border border-neutral-200 px-5 py-4">
            <summary className="cursor-pointer font-semibold text-neutral-900 select-none">
                비용 / 사용량
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
