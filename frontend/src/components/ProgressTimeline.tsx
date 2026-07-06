"use client";

import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

import type { JobEvent } from "@/hooks/useJobEvents";
import { useT } from "@/lib/i18n";

const ORDER: string[] = [
    "queued",
    "converting",
    "analyzing_template",
    "strategizing",
    "acquiring_images",
    "executing_pages",
    "checking_quality",
    "narrating",
    "exporting",
    "done",
];

interface ProgressTimelineProps {
    events: JobEvent[];
    connected: boolean;
    error: string | null;
}

export default function ProgressTimeline({
    events,
    connected,
    error,
}: ProgressTimelineProps) {
    const t = useT();
    // Stage labels live in the shared dictionary (t.stages) — the engine can
    // emit stages we don't know yet, so fall back to the raw key.
    const stageLabel = (stage: string) =>
        (t.stages as Record<string, string>)[stage] ?? stage;

    // Track the most recent occurrence of each stage so we can label one as
    // "active" and the others as "done".
    const seenStages = new Set<string>();
    let latestStage: string | null = null;
    let isFailed = false;

    for (const ev of events) {
        const stage = ev.payload.stage;
        if (typeof stage === "string") {
            seenStages.add(stage);
            latestStage = stage;
            if (stage === "failed") isFailed = true;
        }
    }

    return (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <header className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900">{t.timeline.title}</h2>
                <span className="text-xs text-neutral-500">
                    {error
                        ? t.timeline.disconnected
                        : connected
                          ? t.timeline.live
                          : isFailed
                            ? t.timeline.closed
                            : t.timeline.waiting}
                </span>
            </header>

            <ol className="space-y-2.5">
                {/* Doc jobs (docx/xlsx) emit a subset of stages — once the job
                    finished, show only stages that actually ran; while running,
                    "past" means SEEN, never inferred from list position. */}
                {(seenStages.has("done")
                    ? ORDER.filter((s) => seenStages.has(s))
                    : ORDER
                ).map((stage) => {
                    const isCurrent = latestStage === stage && !isFailed;
                    const isPast = seenStages.has(stage) && !isCurrent;
                    return (
                        <li
                            key={stage}
                            className="flex items-center gap-3 text-sm"
                        >
                            <StageIcon
                                state={
                                    isCurrent
                                        ? "running"
                                        : isPast
                                          ? "done"
                                          : "pending"
                                }
                            />
                            <span
                                className={
                                    isCurrent
                                        ? "font-medium text-neutral-900"
                                        : isPast
                                          ? "text-neutral-700"
                                          : "text-neutral-400"
                                }
                            >
                                {stageLabel(stage)}
                            </span>
                        </li>
                    );
                })}

                {isFailed && (
                    <li className="flex items-center gap-3 text-sm text-red-600">
                        <AlertCircle className="size-4" />
                        <span className="font-medium">{t.stages.failed}</span>
                    </li>
                )}
            </ol>

            {/* Per-page progress chips when executing pages. */}
            {seenStages.has("executing_pages") && (
                <PageChips events={events} />
            )}

            {error && (
                <p className="mt-4 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
}

function StageIcon({
    state,
}: {
    state: "pending" | "running" | "done";
}) {
    if (state === "running") {
        return <Loader2 className="size-4 text-primary-600 animate-spin" />;
    }
    if (state === "done") {
        return <CheckCircle2 className="size-4 text-emerald-600" />;
    }
    return <Circle className="size-4 text-neutral-300" />;
}

function PageChips({ events }: { events: JobEvent[] }) {
    // Collect every distinct page_index whose stage hit executing_page or
    // whose event type is `page_done`. Render as a chip strip.
    const seen = new Set<number>();
    for (const ev of events) {
        const idx = ev.payload.page_index;
        if (typeof idx === "number") seen.add(idx);
    }
    if (seen.size === 0) return null;
    const ordered = Array.from(seen).sort((a, b) => a - b);
    return (
        <div className="mt-4 flex flex-wrap gap-1.5">
            {ordered.map((i) => (
                <span
                    key={i}
                    className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                >
                    {i + 1}p
                </span>
            ))}
        </div>
    );
}
