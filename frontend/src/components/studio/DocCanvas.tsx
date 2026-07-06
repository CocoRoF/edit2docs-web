"use client";

import { useEffect, useRef } from "react";

import { Download, FileUp, Loader2, Undo2 } from "lucide-react";

import { withBase } from "@/lib/basePath";
import { useT } from "@/lib/i18n";

interface DocCanvasProps {
    format: "docx" | "xlsx";
    filename: string;
    assetId: string;
    /** Addressable display HTML from the engine (data-e2d-* markup). */
    html: string;
    busy: boolean;
    loading: boolean;
    canUndo: boolean;
    onUndo: () => void;
    onReset: () => void;
    /**
     * CSS selector of the region the engine is editing right now (from
     * the live-edit op stream) — highlighted and scrolled into view.
     */
    liveTarget?: string | null;
    /** Selectors of this turn's applied edits — flashed once per refresh. */
    flashTargets?: string[];
}

/**
 * Right-hand canvas for Word / Excel documents: the engine renders the
 * file to structural, *addressable* display-HTML (every paragraph carries
 * `data-e2d-para`, every cell `data-e2d-cell` — no scripts), shown in a
 * paper-like page. Editing happens through chat; while a turn streams,
 * the region each op touches is highlighted via those addresses.
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
    liveTarget = null,
    flashTargets = [],
}: DocCanvasProps) {
    const t = useT();
    const previewRef = useRef<HTMLDivElement>(null);
    const flashRef = useRef<string[]>(flashTargets);
    flashRef.current = flashTargets;

    // Live highlight: mark the region the current op touches.
    useEffect(() => {
        const root = previewRef.current;
        if (!root) return;
        root.querySelectorAll(".e2d-live-hit").forEach((el) =>
            el.classList.remove("e2d-live-hit"),
        );
        if (!liveTarget) return;
        try {
            const el = root.querySelector(liveTarget);
            if (el) {
                el.classList.add("e2d-live-hit");
                el.scrollIntoView({ block: "center", behavior: "smooth" });
            }
        } catch {
            // a malformed selector must never break the canvas
        }
    }, [liveTarget, html]);

    // After a refreshed preview lands, flash every region this turn
    // edited. Keyed on `html` only (targets read through a ref) so
    // mid-stream target updates don't re-trigger the animation.
    useEffect(() => {
        const root = previewRef.current;
        const targets = flashRef.current;
        if (!root || targets.length === 0) return;
        const els: Element[] = [];
        for (const selector of targets) {
            try {
                const el = root.querySelector(selector);
                if (el) els.push(el);
            } catch {
                /* skip malformed selector */
            }
        }
        if (els.length === 0) return;
        els.forEach((el) => el.classList.add("e2d-flash"));
        els[0].scrollIntoView({ block: "center", behavior: "smooth" });
        const timer = setTimeout(
            () => els.forEach((el) => el.classList.remove("e2d-flash")),
            2600,
        );
        return () => clearTimeout(timer);
    }, [html]);

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
                    {t.canvas.undo}
                </button>
                <a
                    href={withBase(`/api/assets/${assetId}/download`)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                    <Download className="size-3.5" />
                    {t.canvas.download}
                </a>
                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                    <FileUp className="size-3.5" />
                    {t.canvas.otherFile}
                </button>
            </div>

            <div className="relative flex-1 overflow-auto">
                <div className="mx-auto max-w-3xl px-6 py-6">
                    <div
                        ref={previewRef}
                        className="doc-preview rounded-lg border border-neutral-200 bg-white px-10 py-9 shadow-sm"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </div>

                {(busy || loading) && (
                    <div className="pointer-events-none sticky bottom-0 inset-x-0 flex justify-center pb-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900/85 px-4 py-2 text-xs font-medium text-white shadow-lg">
                            <Loader2 className="size-3.5 animate-spin" />
                            {busy ? t.canvas.applying : t.canvas.refreshing}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
