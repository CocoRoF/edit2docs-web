"use client";

import {
    AlertCircle,
    FileText,
    Key,
    Loader2,
    Paperclip,
    Send,
    Settings2,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

import { withBase } from "@/lib/basePath";
import { localeTag, useLocale, useT } from "@/lib/i18n";
import type { UploadedAsset } from "@/components/UploadDropzone";

/** One rendered chat bubble. */
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    kind?: "normal" | "error";
    /** Applied operations summary chips (assistant messages only). */
    ops?: Array<{ action: string; slide?: number; after?: number }>;
}

export interface StudioConfig {
    anthropicKey: string;
    model: string;
    lang: "ko-KR" | "en-US" | "zh-CN" | "ja-JP";
}

interface ChatPanelProps {
    messages: ChatMessage[];
    config: StudioConfig;
    onConfigChange: (config: StudioConfig) => void;
    /** attachments = source asset ids uploaded for THIS turn. */
    onSend: (instruction: string, attachments: UploadedAsset[]) => void;
    /** A turn is running: input disabled, progress bubble shown. */
    busy: boolean;
    /** Current stage label while busy (from the SSE stream). */
    stageLabel: string | null;
    /** Chat is enabled only once a deck is loaded. */
    disabled: boolean;
}

const ATTACH_ACCEPT =
    "application/pdf," +
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
    "application/msword," +
    "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
    "text/html,application/epub+zip";

/**
 * Left-hand panel of the studio: BYOK config on top, chat transcript in
 * the middle, instruction input at the bottom.
 */
export default function ChatPanel({
    messages,
    config,
    onConfigChange,
    onSend,
    busy,
    stageLabel,
    disabled,
}: ChatPanelProps) {
    const t = useT();
    const { locale } = useLocale();
    const [draft, setDraft] = useState("");
    const [attachments, setAttachments] = useState<UploadedAsset[]>([]);
    const [uploading, setUploading] = useState(false);
    const [attachError, setAttachError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const models = [
        { value: "claude-opus-4-7", label: t.chat.modelOpus },
        { value: "claude-sonnet-4-6", label: t.chat.modelSonnet },
    ];

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, busy, stageLabel]);

    // Auto-grow the textarea with its content (up to ~7 lines).
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
    }, [draft]);

    const keyMissing = config.anthropicKey.trim().length === 0;
    const canAttach = !disabled && !busy && !uploading;
    const canSend =
        !disabled && !busy && !uploading && !keyMissing && draft.trim().length >= 2;

    function submit() {
        if (!canSend) return;
        onSend(draft.trim(), attachments);
        setDraft("");
        setAttachments([]);
        requestAnimationFrame(() => {
            if (textareaRef.current) textareaRef.current.style.height = "auto";
        });
    }

    // ── Drag & drop reference documents onto the composer ──
    const handleDragOver = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            if (!canAttach) return;
            const types = e.dataTransfer?.types;
            if (!types || !Array.from(types).includes("Files")) return;
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
        },
        [canAttach],
    );
    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
    }, []);
    const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            if (!canAttach) return;
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            const files = e.dataTransfer?.files;
            if (files) {
                for (const f of Array.from(files)) void attachFile(f);
            }
        },
        // attachFile is stable enough for this closure.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canAttach],
    );

    async function attachFile(file: File) {
        setAttachError(null);
        if (file.size > 200 * 1024 * 1024) {
            setAttachError(t.chat.attachTooLarge);
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.set("file", file, file.name);
            const res = await fetch(withBase("/api/upload"), {
                method: "POST",
                body: form,
                headers: { "Accept-Language": localeTag(locale) },
            });
            if (!res.ok) {
                setAttachError(t.chat.attachUploadFailed(res.status));
                return;
            }
            const asset = (await res.json()) as UploadedAsset;
            setAttachments((prev) => [...prev, asset]);
        } catch (err) {
            setAttachError(
                t.chat.attachError(err instanceof Error ? err.message : String(err)),
            );
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="flex h-full flex-col">
            <details
                className="border-b border-neutral-200 px-4 py-3"
                open={keyMissing}
            >
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-800 select-none">
                    <Settings2 className="size-4" />
                    {t.chat.settings}
                    {keyMissing && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            {t.chat.keyRequired}
                        </span>
                    )}
                </summary>
                <div className="mt-3 space-y-3">
                    <label className="block space-y-1">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                            <Key className="size-3.5" />
                            {t.chat.anthropicKeyLabel}
                        </span>
                        <input
                            type="password"
                            value={config.anthropicKey}
                            onChange={(e) =>
                                onConfigChange({ ...config, anthropicKey: e.target.value })
                            }
                            autoComplete="off"
                            placeholder="sk-ant-…"
                            className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <span className="block text-[11px] text-neutral-500">
                            {t.chat.keyHint}
                        </span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-1">
                            <span className="text-xs font-medium text-neutral-700">{t.chat.modelLabel}</span>
                            <select
                                value={config.model}
                                onChange={(e) =>
                                    onConfigChange({ ...config, model: e.target.value })
                                }
                                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs"
                            >
                                {models.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-medium text-neutral-700">{t.chat.langLabel}</span>
                            <select
                                value={config.lang}
                                onChange={(e) =>
                                    onConfigChange({
                                        ...config,
                                        lang: e.target.value as StudioConfig["lang"],
                                    })
                                }
                                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs"
                            >
                                {/* Locale-native labels by design. */}
                                <option value="en-US">English</option>
                                <option value="ko-KR">한국어</option>
                                <option value="zh-CN">简体中文</option>
                                <option value="ja-JP">日本語</option>
                            </select>
                        </label>
                    </div>
                </div>
            </details>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && !busy && (
                    <div className="space-y-2 rounded-lg bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
                        <p className="font-medium text-neutral-800">{t.chat.examplesTitle}</p>
                        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
                            <li>{t.chat.example1}</li>
                            <li>{t.chat.example2}</li>
                            <li>{t.chat.example3}</li>
                            <li>{t.chat.example4}</li>
                            <li>{t.chat.example5}</li>
                        </ul>
                        <p className="pt-1 text-[11px] text-neutral-500">
                            {t.chat.tipPrefix}
                            <b>{t.chat.tipStrong}</b>
                            {t.chat.tipSuffix}
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                        <div
                            className={
                                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed " +
                                (msg.role === "user"
                                    ? "bg-primary-600 text-white"
                                    : msg.kind === "error"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-neutral-100 text-neutral-800")
                            }
                        >
                            {msg.kind === "error" && (
                                <AlertCircle className="mb-1 size-4" aria-hidden />
                            )}
                            {msg.content}
                            {msg.ops && msg.ops.length > 0 && (
                                <span className="mt-2 flex flex-wrap gap-1.5">
                                    {msg.ops.map((op, j) => (
                                        <span
                                            key={j}
                                            className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-neutral-700 border border-neutral-200"
                                        >
                                            {(t.chat.ops as Record<string, string>)[
                                                op.action
                                            ] ?? op.action}
                                            {op.slide != null && ` ${t.chat.slideRef(op.slide)}`}
                                            {op.after != null && ` ${t.chat.afterRef(op.after)}`}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {busy && (
                    <div className="flex justify-start">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-3.5 py-2.5 text-sm text-neutral-600">
                            <Loader2 className="size-4 animate-spin text-primary-600" />
                            {stageLabel ?? t.studio.working}
                        </div>
                    </div>
                )}
            </div>

            {/* Modern composer — input on top (full width, grows upward),
                controls in the toolbar below. Same structure as hr_blog2.0's
                AgentInput: attachment strip / container (textarea + toolbar) /
                bottom hint line. */}
            <div
                className="relative border-t border-neutral-200 p-3"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {dragOver && (
                    <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary-500 bg-primary-50/80">
                        <span className="text-sm font-medium text-primary-700">
                            {t.chat.dropHere}
                        </span>
                    </div>
                )}

                {/* Attachment strip */}
                {(attachments.length > 0 || uploading) && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        {attachments.map((a) => (
                            <span
                                key={a.id}
                                className="group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-[11px] font-medium text-primary-700"
                                title={a.original_filename ?? t.studio.fileFallback}
                            >
                                <FileText className="size-3.5 shrink-0" />
                                <span className="truncate">
                                    {a.original_filename ?? t.studio.fileFallback}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setAttachments((prev) =>
                                            prev.filter((x) => x.id !== a.id),
                                        )
                                    }
                                    aria-label={t.chat.removeAttachment}
                                    className="rounded p-0.5 text-primary-400 hover:bg-primary-100 hover:text-primary-700"
                                >
                                    <X className="size-3" />
                                </button>
                            </span>
                        ))}
                        {uploading && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] text-neutral-500">
                                <Loader2 className="size-3 animate-spin" />
                                {t.chat.uploading}
                            </span>
                        )}
                    </div>
                )}
                {attachError && (
                    <p className="mb-1.5 text-[11px] text-red-600">{attachError}</p>
                )}

                <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white px-3 pt-2.5 pb-2 transition-colors focus-within:border-primary-400">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ATTACH_ACCEPT}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) {
                                for (const f of Array.from(e.target.files)) {
                                    void attachFile(f);
                                }
                            }
                            e.target.value = "";
                        }}
                    />

                    <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                submit();
                            }
                        }}
                        rows={1}
                        disabled={disabled || busy}
                        placeholder={
                            disabled
                                ? t.chat.placeholderNoDeck
                                : busy
                                  ? t.chat.placeholderBusy
                                  : attachments.length > 0
                                    ? t.chat.placeholderAttach
                                    : t.chat.placeholder
                        }
                        className="block max-h-[180px] w-full resize-none bg-transparent py-1 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-60"
                    />

                    {/* Bottom toolbar — attach on the left, send on the right */}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!canAttach}
                            title={
                                canAttach
                                    ? t.chat.attachTitle
                                    : t.chat.attachDisabledTitle
                            }
                            className="flex size-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <Paperclip className="size-4" />
                        </button>

                        <button
                            type="button"
                            onClick={submit}
                            disabled={!canSend}
                            title={
                                keyMissing && !disabled
                                    ? t.chat.sendKeyFirst
                                    : uploading
                                      ? t.chat.sendUploading
                                      : undefined
                            }
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {busy ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            {t.chat.send}
                        </button>
                    </div>
                </div>

                {/* Bottom hint line */}
                <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[10px] text-neutral-400">
                    <span>
                        {models.find((m) => m.value === config.model)?.label ?? config.model}
                        {" · "}
                        {config.lang === "ko-KR"
                            ? t.chat.replyKo
                            : config.lang === "en-US"
                              ? t.chat.replyEn
                              : config.lang}
                        {" · "}
                        {t.chat.newVersionPerEdit}
                    </span>
                    {keyMissing && !disabled && (
                        <span className="text-amber-600">{t.chat.keyNeededHint}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
