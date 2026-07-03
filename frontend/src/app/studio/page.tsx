"use client";

import { MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChatPanel, {
    type ChatMessage,
    type StudioConfig,
} from "@/components/studio/ChatPanel";
import DocCanvas from "@/components/studio/DocCanvas";
import SlideCanvas, {
    type PreviewSlide,
    type TextEditTarget,
} from "@/components/studio/SlideCanvas";
import UploadDropzone, { type UploadedAsset } from "@/components/UploadDropzone";
import { useJobEvents, type JobEvent } from "@/hooks/useJobEvents";
import { withBase } from "@/lib/basePath";

const DOC_MIMES =
    "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Korean labels for the edit-deck pipeline stages. */
const STAGE_LABEL: Record<string, string> = {
    queued: "작업 대기 중…",
    analyzing_deck: "덱 렌더링 중…",
    planning_edits: "편집 계획 수립 중…",
    editing_slides: "슬라이드 편집 중…",
    applying_edits: "문서 반영 중…",
    done: "완료",
    failed: "실패",
};

const PANEL_WIDTH_KEY = "e2p-studio-panel-width";
const PANEL_MIN = 320;
const PANEL_MAX = 680;

/** One op descriptor from the live-edit stream (message_vars.op / .plan). */
interface EditOp {
    action?: string;
    phase?: "start" | "done";
    status?: string;
    target?: Record<string, unknown>;
}

/**
 * Map a live-edit op target to a CSS selector over the preview's
 * data-e2d-* addresses (engine v0.4.0). Returns null for targets the
 * canvas cannot locate (e.g. whole-sheet appends, para -1 inserts).
 */
function opTargetSelector(target: Record<string, unknown> | undefined): string | null {
    if (!target) return null;
    switch (target.kind) {
        case "paragraph":
        case "paragraph_after": {
            const para = Number(target.para);
            return Number.isInteger(para) && para >= 0
                ? `[data-e2d-para="${para}"]`
                : null;
        }
        case "table_cell": {
            const { table, row, col } = target;
            return `[data-e2d-table="${Number(table)}"] [data-e2d-cell="${Number(row)},${Number(col)}"]`;
        }
        case "cell": {
            const sheet = CSS.escape(String(target.sheet ?? ""));
            const cell = String(target.cell ?? "").replace(/[^A-Za-z0-9]/g, "");
            return cell ? `[data-e2d-sheet="${sheet}"] [data-e2d-cell="${cell}"]` : null;
        }
        case "sheet":
            return `[data-e2d-sheet="${CSS.escape(String(target.sheet ?? ""))}"]`;
        default:
            return null;
    }
}

interface DeckState {
    assetId: string;
    filename: string;
}

interface EditJobResult {
    changed: boolean;
    page_count: number;
    reply: string;
    operations: Array<{ action: string; slide?: number; after?: number }>;
    pptx_asset_id: string;
    doc_asset_id?: string;
}

/**
 * "문서 같이 만들기" studio — resizable split: chat (left) / canvas (right).
 *
 * Deck state is a revision chain of asset ids: chat turns and inline text
 * edits each produce a new revision (the engine preserves prior assets),
 * so 되돌리기 is just stepping back one id and re-rendering.
 */
export default function StudioPage() {
    const [deck, setDeck] = useState<DeckState | null>(null);
    const [revisions, setRevisions] = useState<string[]>([]);
    const [slides, setSlides] = useState<PreviewSlide[]>([]);
    const [docFormat, setDocFormat] = useState<"pptx" | "docx" | "xlsx">("pptx");
    const [docHtml, setDocHtml] = useState<string>("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [config, setConfig] = useState<StudioConfig>({
        anthropicKey: "",
        model: "claude-opus-4-7",
        lang: "ko-KR",
    });
    const [jobId, setJobId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [panelWidth, setPanelWidth] = useState(400);
    const dragging = useRef(false);

    // ----- resizable divider ------------------------------------------------
    useEffect(() => {
        const saved = Number(localStorage.getItem(PANEL_WIDTH_KEY));
        if (saved >= PANEL_MIN && saved <= PANEL_MAX) setPanelWidth(saved);
    }, []);

    const startDrag = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            const width = Math.min(PANEL_MAX, Math.max(PANEL_MIN, ev.clientX));
            setPanelWidth(width);
        };
        const onUp = (ev: MouseEvent) => {
            dragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            const width = Math.min(PANEL_MAX, Math.max(PANEL_MIN, ev.clientX));
            localStorage.setItem(PANEL_WIDTH_KEY, String(width));
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, []);

    // ----- preview ----------------------------------------------------------
    const loadPreview = useCallback(async (assetId: string) => {
        setPreviewLoading(true);
        try {
            const res = await fetch(withBase("/api/preview"), {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept-Language": "ko-KR" },
                body: JSON.stringify({ pptx_asset_id: assetId }),
            });
            if (!res.ok) {
                let msg = `미리보기 렌더링에 실패했습니다 (HTTP ${res.status}).`;
                try {
                    const j = (await res.json()) as { error?: { message?: string } };
                    if (j.error?.message) msg = j.error.message;
                } catch {
                    /* ignore */
                }
                setMessages((prev) => [...prev, { role: "assistant", content: msg, kind: "error" }]);
                setSlides([]);
                setDocHtml("");
                return;
            }
            const body = (await res.json()) as {
                format: "pptx" | "docx" | "xlsx";
                slides: PreviewSlide[];
                html: string | null;
            };
            setDocFormat(body.format);
            setSlides(body.slides ?? []);
            setDocHtml(body.html ?? "");
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `미리보기 요청 중 오류: ${err instanceof Error ? err.message : String(err)}`,
                    kind: "error",
                },
            ]);
            setSlides([]);
            setDocHtml("");
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    /** Adopt a new deck revision: swap asset, extend history, re-render. */
    const adoptRevision = useCallback(
        (assetId: string) => {
            setRevisions((prev) => [...prev.slice(-19), assetId]);
            setDeck((prev) => (prev ? { ...prev, assetId } : prev));
            void loadPreview(assetId);
        },
        [loadPreview],
    );

    const handleUploaded = useCallback(
        (asset: UploadedAsset) => {
            setDeck({ assetId: asset.id, filename: asset.original_filename ?? "document" });
            setRevisions([asset.id]);
            setMessages([]);
            setSlides([]);
            setDocHtml("");
            setDocFormat("pptx");
            void loadPreview(asset.id);
        },
        [loadPreview],
    );

    const undo = useCallback(() => {
        if (revisions.length < 2) return;
        const next = revisions.slice(0, -1);
        const assetId = next[next.length - 1];
        setRevisions(next);
        setDeck((d) => (d ? { ...d, assetId } : d));
        setMessages((m) => [
            ...m,
            { role: "assistant", content: "이전 버전으로 되돌렸습니다." },
        ]);
        void loadPreview(assetId);
    }, [revisions, loadPreview]);

    // ----- chat turn --------------------------------------------------------
    const finishTurn = useCallback(
        async (finalEvent: JobEvent) => {
            const id = finalEvent.job_id;
            try {
                const result = await pollJobResult(id);
                if (result === null) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            content: "작업 결과를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
                            kind: "error",
                        },
                    ]);
                    return;
                }
                if (result.status === "failed") {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            content: `편집에 실패했습니다: ${result.error_message ?? "알 수 없는 오류"}`,
                            kind: "error",
                        },
                    ]);
                    return;
                }
                const r = result.result as unknown as EditJobResult;
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: r.reply || "요청을 처리했습니다.",
                        ops: r.changed ? r.operations : undefined,
                    },
                ]);
                const newAsset = r.doc_asset_id ?? r.pptx_asset_id;
                if (r.changed && newAsset) adoptRevision(newAsset);
            } finally {
                setBusy(false);
                setJobId(null);
            }
        },
        [adoptRevision],
    );

    const { events } = useJobEvents({ jobId, onTerminal: finishTurn });
    const lastStage = [...events].reverse().find((e) => typeof e.payload.stage === "string")
        ?.payload.stage as string | undefined;

    // Live-edit op stream (engine v0.3.0+): the op being applied right
    // now, and every applied target of the turn — located in the preview
    // via its data-e2d-* addresses (engine v0.4.0).
    const liveTarget = useMemo(() => {
        for (let i = events.length - 1; i >= 0; i--) {
            const op = events[i].payload.message_vars?.op as EditOp | undefined;
            if (op) {
                if (op.phase === "done" && i === events.length - 1) return null;
                return opTargetSelector(op.target);
            }
        }
        return null;
    }, [events]);
    const flashTargets = useMemo(() => {
        const selectors: string[] = [];
        for (const event of events) {
            const op = event.payload.message_vars?.op as EditOp | undefined;
            if (op?.phase === "done" && op.status === "applied") {
                const selector = opTargetSelector(op.target);
                if (selector && !selectors.includes(selector)) selectors.push(selector);
            }
        }
        return selectors;
    }, [events]);

    const send = useCallback(
        async (instruction: string, attachments: UploadedAsset[]) => {
            if (!deck) return;
            const history = messages
                .filter((m) => m.kind !== "error")
                .map((m) => ({ role: m.role, content: m.content }));
            const label =
                attachments.length > 0
                    ? `${instruction}\n[첨부] ${attachments
                          .map((a) => a.original_filename ?? "파일")
                          .join(", ")}`
                    : instruction;
            setMessages((prev) => [...prev, { role: "user", content: label }]);
            setBusy(true);

            try {
                const res = await fetch(withBase("/api/jobs/edit-deck"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept-Language": "ko-KR",
                        "X-Anthropic-API-Key": config.anthropicKey.trim(),
                    },
                    body: JSON.stringify({
                        pptx_asset_id: deck.assetId,
                        instruction,
                        chat_history: history.slice(-12),
                        source_asset_ids: attachments.map((a) => a.id),
                        lang: config.lang,
                        model: config.model,
                        output_basename: deck.filename.replace(/\.(pptx|docx|xlsx)$/i, "") || "document",
                    }),
                });
                if (!res.ok) {
                    let msg = `요청에 실패했습니다 (HTTP ${res.status}).`;
                    try {
                        const j = (await res.json()) as { error?: { message?: string } };
                        if (j.error?.message) msg = j.error.message;
                    } catch {
                        /* ignore */
                    }
                    setMessages((prev) => [...prev, { role: "assistant", content: msg, kind: "error" }]);
                    setBusy(false);
                    return;
                }
                const job = (await res.json()) as { id: string };
                setJobId(job.id);
            } catch (err) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: `요청 중 오류: ${err instanceof Error ? err.message : String(err)}`,
                        kind: "error",
                    },
                ]);
                setBusy(false);
            }
        },
        [deck, messages, config],
    );

    // ----- inline text edit (no LLM) ---------------------------------------
    const handleTextEdit = useCallback(
        async (target: TextEditTarget, newText: string): Promise<string | null> => {
            if (!deck) return "덱이 없습니다.";
            try {
                const res = await fetch(withBase("/api/text-edits"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept-Language": "ko-KR" },
                    body: JSON.stringify({
                        pptx_asset_id: deck.assetId,
                        edits: [
                            {
                                slide: target.slide,
                                shape_id: target.shapeId,
                                para: target.para,
                                new_text: newText,
                                old_text: target.oldText,
                                row: target.row ?? null,
                                col: target.col ?? null,
                            },
                        ],
                        output_basename: deck.filename.replace(/\.(pptx|docx|xlsx)$/i, "") || "document",
                    }),
                });
                if (!res.ok) {
                    try {
                        const j = (await res.json()) as { error?: { message?: string } };
                        return j.error?.message ?? `수정 실패 (HTTP ${res.status})`;
                    } catch {
                        return `수정 실패 (HTTP ${res.status})`;
                    }
                }
                const body = (await res.json()) as {
                    pptx_asset_id: string;
                    applied: number;
                    results: Array<{ status: string; message?: string }>;
                };
                if (body.applied === 0) {
                    const status = body.results[0]?.status;
                    if (status === "stale") {
                        void loadPreview(deck.assetId);
                        return "슬라이드가 이미 변경되었습니다. 미리보기를 갱신했으니 다시 시도하세요.";
                    }
                    return body.results[0]?.message ?? "수정을 적용하지 못했습니다.";
                }
                adoptRevision(body.pptx_asset_id);
                return null;
            } catch (err) {
                return `수정 중 오류: ${err instanceof Error ? err.message : String(err)}`;
            }
        },
        [deck, adoptRevision, loadPreview],
    );

    const reset = useCallback(() => {
        setDeck(null);
        setRevisions([]);
        setSlides([]);
        setDocHtml("");
        setDocFormat("pptx");
        setMessages([]);
        setJobId(null);
        setBusy(false);
    }, []);

    return (
        <main className="flex h-[calc(100vh-3.5rem)] min-h-[480px]">
            <aside
                style={{ width: panelWidth }}
                className="flex shrink-0 flex-col border-r border-neutral-200 bg-white"
            >
                <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
                    <MessageSquareText className="size-4 text-primary-600" />
                    <h1 className="text-sm font-semibold text-neutral-900">문서 같이 만들기</h1>
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                        beta
                    </span>
                </div>
                <ChatPanel
                    messages={messages}
                    config={config}
                    onConfigChange={setConfig}
                    onSend={send}
                    busy={busy}
                    stageLabel={busy ? STAGE_LABEL[lastStage ?? "queued"] ?? "작업 중…" : null}
                    disabled={deck === null}
                />
            </aside>

            <div
                role="separator"
                aria-orientation="vertical"
                onMouseDown={startDrag}
                className="w-1.5 shrink-0 cursor-col-resize bg-neutral-100 transition-colors hover:bg-primary-200 active:bg-primary-300"
            />

            <section className="min-w-0 flex-1">
                {deck === null ? (
                    <div className="flex h-full items-center justify-center bg-neutral-100 px-6">
                        <div className="w-full max-w-lg space-y-4 text-center">
                            <h2 className="text-xl font-bold text-neutral-900">
                                문서를 올리고 채팅으로 편집하세요
                            </h2>
                            <p className="text-sm text-neutral-600">
                                PPT·Word·Excel을 업로드하면 미리보기가 나타나고,
                                채팅으로 수정·추가·삭제를 요청할 수 있습니다. PPT는
                                텍스트 더블클릭 즉시 수정도 지원합니다. 편집마다 새
                                버전이 만들어져 언제든 되돌리고 다운로드할 수 있습니다.
                            </p>
                            <UploadDropzone
                                inputId="studio-upload"
                                accept={DOC_MIMES}
                                formatsLabel="PPTX · DOCX · XLSX (최대 200 MB)"
                                onUploaded={handleUploaded}
                            />
                        </div>
                    </div>
                ) : docFormat === "pptx" ? (
                    <SlideCanvas
                        filename={deck.filename}
                        assetId={deck.assetId}
                        slides={slides}
                        busy={busy}
                        loading={previewLoading}
                        canUndo={revisions.length > 1}
                        onUndo={undo}
                        onReset={reset}
                        onTextEdit={handleTextEdit}
                    />
                ) : (
                    <DocCanvas
                        format={docFormat}
                        filename={deck.filename}
                        assetId={deck.assetId}
                        html={docHtml}
                        busy={busy}
                        loading={previewLoading}
                        canUndo={revisions.length > 1}
                        onUndo={undo}
                        onReset={reset}
                        liveTarget={busy ? liveTarget : null}
                        flashTargets={flashTargets}
                    />
                )}
            </section>
        </main>
    );
}

interface JobRow {
    status: string;
    error_message: string | null;
    result: Record<string, unknown>;
}

/** The `done` SSE event can beat the job row's final commit; poll briefly. */
async function pollJobResult(jobId: string): Promise<JobRow | null> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const res = await fetch(withBase(`/api/jobs/${jobId}`), {
            headers: { "Accept-Language": "ko-KR" },
        });
        if (res.ok) {
            const job = (await res.json()) as JobRow;
            if (job.status === "done" || job.status === "failed" || job.status === "cancelled") {
                return job;
            }
        }
        await new Promise((r) => setTimeout(r, 1000));
    }
    return null;
}
