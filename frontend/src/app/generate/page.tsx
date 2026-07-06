"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import GenerateForm from "@/components/GenerateForm";
import ProgressTimeline from "@/components/ProgressTimeline";
import { useJobEvents, type JobEvent } from "@/hooks/useJobEvents";
import { useT } from "@/lib/i18n";

/**
 * Generate screen.
 *
 * Single-form flow:
 *   1. Fill in user_intent + BYOK Anthropic key (source file is optional).
 *   2. Watch the SSE stream until the engine flips to `done` / `failed`.
 */
export default function GeneratePage() {
    const router = useRouter();
    const t = useT();
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
                    {inProgress ? t.generate.titleInProgress : t.generate.title}
                </h1>
                <p className="mt-3 text-neutral-600">
                    {inProgress
                        ? t.generate.subtitleInProgress
                        : t.generate.subtitle}
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
    const t = useT();
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
                {isDone ? t.generate.doneTitle : t.generate.failedTitle}
            </h3>
            <p className="mt-1 text-sm text-neutral-700">
                job id <code className="font-mono">{jobId.slice(0, 8)}…</code>
            </p>
            <p className="mt-3 text-xs text-neutral-600">
                {t.generate.redirecting}
            </p>
        </div>
    );
}
