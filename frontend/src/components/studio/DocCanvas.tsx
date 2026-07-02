"use client";

import { Download, FileUp, Loader2, Undo2 } from "lucide-react";

import { withBase } from "@/lib/basePath";

interface DocCanvasProps {
    format: "docx" | "xlsx";
    filename: string;
    assetId: string;
    /** Display HTML from the engine (mammoth for docx, tables for xlsx). */
    html: string;
    busy: boolean;
    loading: boolean;
    canUndo: boolean;
    onUndo: () => void;
    onReset: () => void;
}

/**
 * Right-hand canvas for Word / Excel documents: the engine renders the
 * file to structural display-HTML (headings/lists/tables only — no
 * scripts), shown in a paper-like page. Editing happens through chat;
 * inline double-click editing is a PPTX-only feature for now.
 */
export default function DocCanvas({
    format,
    filename,
    assetId,
    html,
    busy,
    loading,
    canUndo,
    onUndo,
    onReset,
}: DocCanvasProps) {
    return (
        <div className="flex h-full flex-col bg-neutral-100">
            <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
                    {filename}
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium uppercase text-neutral-500">
                        {format}
                    </span>
                </p>
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

            <div className="relative flex-1 overflow-auto">
                <div className="mx-auto max-w-3xl px-6 py-6">
                    <div
                        className="doc-preview rounded-lg border border-neutral-200 bg-white px-10 py-9 shadow-sm"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
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
        </div>
    );
}
