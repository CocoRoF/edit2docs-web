"use client";

import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

import type { JobEvent } from "@/hooks/useJobEvents";

/** Korean labels for every stage the engine emits. */
const STAGE_LABEL: Record<string, string> = {
    queued: "작업 대기",
    converting: "소스 변환 중",
    analyzing_template: "템플릿 PPTX 분석 중",
    strategizing: "디자인 전략 수립 중",
    acquiring_images: "이미지 확보 중",
    executing_pages: "페이지 생성 중",
    checking_quality: "품질 검사 중",
    narrating: "내레이션 합성 중",
    exporting: "PPTX 빌드 중",
    done: "완료",
    failed: "실패",
};

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
                <h2 className="font-semibold text-neutral-900">진행 상황</h2>
                <span className="text-xs text-neutral-500">
                    {error
                        ? "연결 끊김"
                        : connected
                          ? "라이브"
                          : isFailed
                            ? "종료됨"
                            : "대기 중"}
                </span>
            </header>

            <ol className="space-y-2.5">
                {ORDER.map((stage) => {
                    const isCurrent = latestStage === stage && !isFailed;
                    const isPast =
                        ORDER.indexOf(stage) <
                            (latestStage ? ORDER.indexOf(latestStage) : -1) ||
                        seenStages.has(stage);
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
                                {STAGE_LABEL[stage] ?? stage}
                            </span>
                        </li>
                    );
                })}

                {isFailed && (
                    <li className="flex items-center gap-3 text-sm text-red-600">
                        <AlertCircle className="size-4" />
                        <span className="font-medium">{STAGE_LABEL.failed}</span>
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
