"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import GenerateForm from "@/components/GenerateForm";
import ProgressTimeline from "@/components/ProgressTimeline";
import { useJobEvents, type JobEvent } from "@/hooks/useJobEvents";

/**
 * Generate screen.
 *
 * Single-form flow:
 *   1. Fill in user_intent + BYOK Anthropic key (source file is optional).
 *   2. Watch the SSE stream until the engine flips to `done` / `failed`.
 */
export default function GeneratePage() {
    const router = useRouter();
    const [jobId, setJobId] = useState<string | null>(null);
    const [terminal, setTerminal] = useState<JobEvent | null>(null);

    const handleTerminal = useCallback(
        (ev: JobEvent) => {
            setTerminal(ev);
            if (ev.payload.stage === "done" && jobId) {
                setTimeout(() => router.push(`/jobs/${jobId}`), 750);
            }
        },
        [router, jobId],
    );

    const { events, connected, error } = useJobEvents({
        jobId,
        onTerminal: handleTerminal,
    });

    const inProgress = jobId !== null;

    return (
        <main className="flex-1 flex flex-col items-center px-6 py-12 max-w-5xl mx-auto w-full">
            <header className="w-full text-center">
                <h1 className="mt-2 text-3xl font-bold text-neutral-900">
                    {inProgress ? "생성 진행 중" : "PPT 생성"}
                </h1>
                <p className="mt-3 text-neutral-600">
                    {inProgress
                        ? "진행 상황을 실시간으로 받아옵니다. 완료되면 결과 PPTX 와 미리보기가 나타납니다."
                        : "발표 의도와 Anthropic 키만 있으면 시작할 수 있습니다. 소스 파일은 선택입니다."}
                </p>
            </header>

            {!inProgress && (
                <section className="mt-10 w-full max-w-2xl">
                    <GenerateForm
                        onSubmitted={({ jobId }) => setJobId(jobId)}
                    />
                </section>
            )}

            {inProgress && jobId !== null && (
                <section className="mt-10 w-full max-w-3xl space-y-6">
                    <ProgressTimeline
                        events={events}
                        connected={connected}
                        error={error}
                    />
                    {terminal && (
                        <TerminalSummary jobId={jobId} terminal={terminal} />
                    )}
                </section>
            )}
        </main>
    );
}

function TerminalSummary({
    jobId,
    terminal,
}: {
    jobId: string;
    terminal: JobEvent;
}) {
    const stage = terminal.payload.stage ?? "?";
    const isDone = stage === "done";
    return (
        <div
            className={
                isDone
                    ? "rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5"
                    : "rounded-xl border border-red-200 bg-red-50 px-5 py-5"
            }
        >
            <h3 className="font-semibold text-neutral-900">
                {isDone ? "생성이 완료되었습니다" : "작업이 실패했습니다"}
            </h3>
            <p className="mt-1 text-sm text-neutral-700">
                job id <code className="font-mono">{jobId.slice(0, 8)}…</code>
            </p>
            <p className="mt-3 text-xs text-neutral-600">
                결과 페이지로 이동합니다…
            </p>
        </div>
    );
}
