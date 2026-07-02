"use client";

import {
    Download,
    FileUp,
    Loader2,
    Minus,
    Pencil,
    Plus,
    Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { withBase } from "@/lib/basePath";

export interface PreviewSlide {
    index: number;
    svg: string;
}

/** One pending inline text edit, addressed via the engine's SVG tags. */
export interface TextEditTarget {
    slide: number;
    shapeId: number;
    para: number;
    oldText: string;
    /** Table-cell addressing (set together): table.cell(row, col). */
    row?: number;
    col?: number;
}

interface SlideCanvasProps {
    filename: string;
    assetId: string;
    slides: PreviewSlide[];
    /** A chat turn is running — dim the canvas and show a spinner. */
    busy: boolean;
    /** Preview fetch in flight (initial load or refresh after an edit). */
    loading: boolean;
    /** Undo is available (revision history has a previous entry). */
    canUndo: boolean;
    onUndo: () => void;
    onReset: () => void;
    /** Commit an inline text edit; resolves to an error message or null. */
    onTextEdit: (target: TextEditTarget, newText: string) => Promise<string | null>;
}

const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2];

/**
 * Inlining many SVG documents into one DOM makes their internal ids
 * (clipPaths, gradients, shape groups) collide — `url(#clip0)` on slide 7
 * would resolve to slide 1's clipPath. Prefix every id + reference with a
 * per-slide namespace. `data-*` attributes are untouched.
 */
function namespaceSvgIds(svg: string, prefix: string): string {
    return svg
        .replace(/\bid="([^"]+)"/g, `id="${prefix}-$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
        .replace(/\bhref="#([^"]+)"/g, `href="#${prefix}-$1"`)
        .replace(/\bxlink:href="#([^"]+)"/g, `xlink:href="#${prefix}-$1"`);
}

interface EditorState {
    target: TextEditTarget;
    value: string;
    /** Popover anchor, in viewport coordinates. */
    x: number;
    y: number;
    saving: boolean;
    error: string | null;
}

/**
 * Right-hand canvas: a zoomable reading view of every slide rendered as
 * inline SVG. Double-clicking any slide-origin text opens a floating
 * editor that applies the change through POST /api/text-edits — a
 * deterministic engine path, so the result lands in seconds.
 *
 * The SVGs come from our own OOXML->SVG converter (never raw user markup),
 * which emits only shapes/text/images — inline rendering is script-free.
 */
export default function SlideCanvas({
    filename,
    assetId,
    slides,
    busy,
    loading,
    canUndo,
    onUndo,
    onReset,
    onTextEdit,
}: SlideCanvasProps) {
    const [zoomIdx, setZoomIdx] = useState(3); // 100%
    const [editor, setEditor] = useState<EditorState | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const zoom = ZOOM_STEPS[zoomIdx];

    const namespacedSvgs = useMemo(
        () => slides.map((s, i) => namespaceSvgIds(s.svg, `s${i}`)),
        [slides],
    );

    // Close the editor when the deck revision changes under it.
    useEffect(() => {
        setEditor(null);
    }, [assetId]);

    const handleDoubleClick = useCallback(
        (e: React.MouseEvent, slideIndex: number) => {
            const el = e.target as Element;
            const textEl = el.closest("text[data-e2p-para]");
            if (!textEl) return;
            const para = Number(textEl.getAttribute("data-e2p-para"));
            if (!Number.isFinite(para)) return;

            // Plain shape path (p:sp) or table-cell path (graphicFrame).
            let target: TextEditTarget | null = null;
            const shapeEl = el.closest("g[data-e2p-shape]");
            const cellEl = el.closest("g[data-e2p-cell]");
            const tableEl = el.closest("g[data-e2p-table]");
            if (shapeEl) {
                const shapeId = Number(shapeEl.getAttribute("data-e2p-shape"));
                if (Number.isFinite(shapeId)) {
                    target = { slide: slideIndex, shapeId, para, oldText: "" };
                }
            } else if (cellEl && tableEl) {
                const shapeId = Number(tableEl.getAttribute("data-e2p-table"));
                const [row, col] = (cellEl.getAttribute("data-e2p-cell") ?? "")
                    .split(",")
                    .map(Number);
                if (Number.isFinite(shapeId) && Number.isFinite(row) && Number.isFinite(col)) {
                    target = { slide: slideIndex, shapeId, para, oldText: "", row, col };
                }
            }
            if (!target) return;

            // Prefer the OOXML-exact source text the engine embeds
            // (data-e2p-text); rendered textContent contains bullets and
            // wrap artifacts that would trip the server's stale guard.
            const oldText =
                textEl.getAttribute("data-e2p-text") ??
                (textEl.textContent ?? "").trim();
            target.oldText = oldText;
            setEditor({
                target,
                value: oldText,
                x: Math.min(e.clientX, window.innerWidth - 380),
                y: Math.min(e.clientY, window.innerHeight - 220),
                saving: false,
                error: null,
            });
        },
        [],
    );

    const commitEdit = useCallback(async () => {
        if (!editor || editor.saving) return;
        if (editor.value.trim() === editor.target.oldText) {
            setEditor(null);
            return;
        }
        setEditor((s) => (s ? { ...s, saving: true, error: null } : s));
        const error = await onTextEdit(editor.target, editor.value);
        if (error) {
            setEditor((s) => (s ? { ...s, saving: false, error } : s));
        } else {
            setEditor(null);
        }
    }, [editor, onTextEdit]);

    return (
        <div className="flex h-full flex-col bg-neutral-100">
            <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
                    {filename}
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                        {slides.length}장
                    </span>
                </p>

                <span className="hidden items-center gap-1 text-[11px] text-neutral-400 lg:inline-flex">
                    <Pencil className="size-3" />
                    텍스트 더블클릭으로 바로 편집
                </span>

                <div className="flex items-center rounded-md border border-neutral-200">
                    <button
                        type="button"
                        onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                        disabled={zoomIdx === 0}
                        aria-label="축소"
                        className="p-1.5 text-neutral-600 hover:bg-neutral-50 disabled:text-neutral-300"
                    >
                        <Minus className="size-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoomIdx(3)}
                        className="min-w-12 px-1 text-center text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        aria-label="100%로"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                        disabled={zoomIdx === ZOOM_STEPS.length - 1}
                        aria-label="확대"
                        className="p-1.5 text-neutral-600 hover:bg-neutral-50 disabled:text-neutral-300"
                    >
                        <Plus className="size-3.5" />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo || busy || loading}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300"
                >
                    <Undo2 className="size-3.5" />
                    되돌리기
                </button>
                <a
                    href={withBase(`/api/assets/${assetId}/download`)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                    <Download className="size-3.5" />
                    다운로드
                </a>
                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                    <FileUp className="size-3.5" />
                    다른 파일
                </button>
            </div>

            <div ref={scrollRef} className="relative flex-1 overflow-auto">
                <div
                    className="mx-auto space-y-6 px-6 py-6"
                    style={{
                        width: `${Math.round(zoom * 100)}%`,
                        maxWidth: zoom <= 1 ? "56rem" : undefined,
                        minWidth: "20rem",
                    }}
                >
                    {slides.map((slide, i) => (
                        <figure key={`${assetId}-${slide.index}`}>
                            <figcaption className="mb-1.5 text-xs font-medium text-neutral-500">
                                {i + 1} / {slides.length}
                            </figcaption>
                            <div
                                className="slide-svg overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
                                onDoubleClick={(e) => handleDoubleClick(e, i)}
                                dangerouslySetInnerHTML={{ __html: namespacedSvgs[i] }}
                            />
                        </figure>
                    ))}
                    {slides.length === 0 && !loading && (
                        <p className="py-20 text-center text-sm text-neutral-500">
                            미리보기를 불러오지 못했습니다.
                        </p>
                    )}
                </div>

                {(busy || loading) && (
                    <div className="pointer-events-none sticky bottom-0 inset-x-0 flex justify-center pb-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900/85 px-4 py-2 text-xs font-medium text-white shadow-lg">
                            <Loader2 className="size-3.5 animate-spin" />
                            {busy ? "편집 반영 중…" : "미리보기 갱신 중…"}
                        </span>
                    </div>
                )}
            </div>

            {editor && (
                <div
                    className="fixed z-50 w-[360px] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl"
                    style={{ left: editor.x, top: editor.y }}
                >
                    <p className="mb-2 text-xs font-medium text-neutral-600">
                        텍스트 편집 — 슬라이드 {editor.target.slide + 1}
                    </p>
                    <textarea
                        autoFocus
                        value={editor.value}
                        onChange={(e) =>
                            setEditor((s) => (s ? { ...s, value: e.target.value } : s))
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                void commitEdit();
                            }
                            if (e.key === "Escape") setEditor(null);
                        }}
                        rows={3}
                        className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    {editor.error && (
                        <p className="mt-1.5 text-xs text-red-600">{editor.error}</p>
                    )}
                    <div className="mt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setEditor(null)}
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                        >
                            취소 (Esc)
                        </button>
                        <button
                            type="button"
                            onClick={() => void commitEdit()}
                            disabled={editor.saving}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:bg-neutral-300"
                        >
                            {editor.saving && <Loader2 className="size-3 animate-spin" />}
                            저장 (Enter)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
