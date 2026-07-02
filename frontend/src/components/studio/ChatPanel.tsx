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

const MODELS = [
    { value: "claude-opus-4-7", label: "Claude Opus 4.7 (기본)" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (빠름)" },
];

const OP_LABEL: Record<string, string> = {
    edit: "수정",
    add: "추가",
    delete: "삭제",
};

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
    const [draft, setDraft] = useState("");
    const [attachments, setAttachments] = useState<UploadedAsset[]>([]);
    const [uploading, setUploading] = useState(false);
    const [attachError, setAttachError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

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
            setAttachError("파일이 200 MB를 초과합니다.");
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.set("file", file, file.name);
            const res = await fetch(withBase("/api/upload"), {
                method: "POST",
                body: form,
                headers: { "Accept-Language": "ko-KR" },
            });
            if (!res.ok) {
                setAttachError(`첨부 업로드 실패 (HTTP ${res.status})`);
                return;
            }
            const asset = (await res.json()) as UploadedAsset;
            setAttachments((prev) => [...prev, asset]);
        } catch (err) {
            setAttachError(
                `첨부 중 오류: ${err instanceof Error ? err.message : String(err)}`,
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
                    설정
                    {keyMissing && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            API 키 필요
                        </span>
                    )}
                </summary>
                <div className="mt-3 space-y-3">
                    <label className="block space-y-1">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                            <Key className="size-3.5" />
                            Anthropic API 키 (BYOK)
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
                            편집 요청에만 사용하며 저장하지 않습니다. 새로고침하면 다시 입력해야 합니다.
                        </span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-1">
                            <span className="text-xs font-medium text-neutral-700">모델</span>
                            <select
                                value={config.model}
                                onChange={(e) =>
                                    onConfigChange({ ...config, model: e.target.value })
                                }
                                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs"
                            >
                                {MODELS.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-medium text-neutral-700">언어</span>
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
                                <option value="ko-KR">한국어</option>
                                <option value="en-US">English</option>
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
                        <p className="font-medium text-neutral-800">이렇게 요청해 보세요</p>
                        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
                            <li>3번 슬라이드 제목을 &lsquo;Q3 실적 요약&rsquo;으로 바꿔줘</li>
                            <li>2번 슬라이드 뒤에 로드맵 슬라이드를 추가해줘</li>
                            <li>마지막 슬라이드를 지워줘</li>
                            <li>📎 문서를 첨부하고 &ldquo;이 내용으로 5번을 채워줘&rdquo;</li>
                            <li>이 덱의 구성이 어떻게 돼? (질문만 해도 됩니다)</li>
                        </ul>
                        <p className="pt-1 text-[11px] text-neutral-500">
                            팁: 오른쪽 캔버스에서 텍스트를 <b>더블클릭</b>하면 AI 없이 즉시 수정됩니다.
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
                                            {OP_LABEL[op.action] ?? op.action}
                                            {op.slide != null && ` ${op.slide}p`}
                                            {op.after != null && ` ${op.after}p 뒤`}
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
                            {stageLabel ?? "작업 중…"}
                        </div>
                    </div>
                )}
            </div>

            {/* 모던 컴포저 — 입력은 위(전체 폭, 위로 자람), 컨트롤은 아래 툴바.
                hr_blog2.0 AgentInput과 동일한 구조: 첨부 스트립 / 컨테이너
                (textarea + 툴바) / 하단 힌트 라인. */}
            <div
                className="relative border-t border-neutral-200 p-3"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {dragOver && (
                    <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary-500 bg-primary-50/80">
                        <span className="text-sm font-medium text-primary-700">
                            참고 문서를 여기에 떨어뜨리세요
                        </span>
                    </div>
                )}

                {/* 첨부 strip */}
                {(attachments.length > 0 || uploading) && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        {attachments.map((a) => (
                            <span
                                key={a.id}
                                className="group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-[11px] font-medium text-primary-700"
                                title={a.original_filename ?? "파일"}
                            >
                                <FileText className="size-3.5 shrink-0" />
                                <span className="truncate">
                                    {a.original_filename ?? "파일"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setAttachments((prev) =>
                                            prev.filter((x) => x.id !== a.id),
                                        )
                                    }
                                    aria-label="첨부 제거"
                                    className="rounded p-0.5 text-primary-400 hover:bg-primary-100 hover:text-primary-700"
                                >
                                    <X className="size-3" />
                                </button>
                            </span>
                        ))}
                        {uploading && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] text-neutral-500">
                                <Loader2 className="size-3 animate-spin" />
                                업로드 중…
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
                                ? "먼저 PPTX 파일을 업로드하세요"
                                : busy
                                  ? "편집 반영 중…"
                                  : attachments.length > 0
                                    ? "첨부한 문서로 무엇을 할까요? (예: 이 내용으로 5번 슬라이드 채워줘)"
                                    : "슬라이드를 어떻게 바꿀까요? (Enter 전송, Shift+Enter 줄바꿈, 문서: 드래그/클립 버튼)"
                        }
                        className="block max-h-[180px] w-full resize-none bg-transparent py-1 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-60"
                    />

                    {/* 하단 툴바 — 왼쪽 첨부, 오른쪽 전송 */}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!canAttach}
                            title={
                                canAttach
                                    ? "참고 문서 첨부 (PDF·DOCX·PPTX·… / 드래그로도 가능)"
                                    : "덱을 업로드한 뒤 첨부할 수 있습니다"
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
                                    ? "설정에서 Anthropic API 키를 먼저 입력하세요"
                                    : uploading
                                      ? "첨부 업로드 완료 대기 중…"
                                      : undefined
                            }
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {busy ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            전송
                        </button>
                    </div>
                </div>

                {/* 하단 힌트 라인 */}
                <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[10px] text-neutral-400">
                    <span>
                        {MODELS.find((m) => m.value === config.model)?.label ?? config.model}
                        {" · "}
                        {config.lang === "ko-KR" ? "한국어 응답" : config.lang}
                        {" · 편집마다 새 버전 생성"}
                    </span>
                    {keyMissing && !disabled && (
                        <span className="text-amber-600">API 키 필요 — 설정에서 입력</span>
                    )}
                </div>
            </div>
        </div>
    );
}
