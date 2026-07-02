"use client";

import { Upload, FileText, X } from "lucide-react";
import { useCallback, useState } from "react";

import { withBase } from "@/lib/basePath";

/** Asset metadata as returned by the engine's POST /v1/assets. */
export type UploadedAsset = {
    id: string;
    kind: string;
    original_filename: string | null;
    storage_key: string;
    mime_type: string;
    size: number;
    sha256: string | null;
    project_id: string | null;
    created_at: string;
};

type UploadStatus =
    | { kind: "idle" }
    | { kind: "uploading"; name: string }
    | { kind: "uploaded"; asset: UploadedAsset }
    | { kind: "error"; message: string };

const ACCEPT_LIST =
    "application/pdf," +
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
    "application/msword," +
    "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
    "text/html,application/epub+zip";

const MAX_BYTES = 200 * 1024 * 1024; // matches nginx's client_max_body_size

interface UploadDropzoneProps {
    onUploaded?: (asset: UploadedAsset) => void;
    onCleared?: () => void;
    /** MIME accept list override (default: every source format). */
    accept?: string;
    /** Formats line under the drop area (default: source format list). */
    formatsLabel?: string;
    /** Unique input id — required when two dropzones render on one page. */
    inputId?: string;
    /** Compact vertical padding (for secondary dropzones). */
    compact?: boolean;
}

export default function UploadDropzone({
    onUploaded,
    onCleared,
    accept = ACCEPT_LIST,
    formatsLabel = "PDF · DOCX · PPTX · XLSX · HTML · EPUB (최대 200 MB)",
    inputId = "upload-file",
    compact = false,
}: UploadDropzoneProps) {
    const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
    const [isDragging, setIsDragging] = useState(false);

    const upload = useCallback(
        async (file: File) => {
            if (file.size > MAX_BYTES) {
                setStatus({
                    kind: "error",
                    message: `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)} MB > 200 MB).`,
                });
                return;
            }

            setStatus({ kind: "uploading", name: file.name });

            const form = new FormData();
            // file.name may be Korean — preserved through FormData.
            form.set("file", file, file.name);

            try {
                const res = await fetch(withBase("/api/upload"), {
                    method: "POST",
                    body: form,
                    headers: {
                        "Accept-Language": "ko-KR",
                    },
                });

                if (!res.ok) {
                    let detail = "";
                    try {
                        const body = (await res.json()) as {
                            error?: { message?: string };
                        };
                        detail = body.error?.message ?? "";
                    } catch {
                        // ignore; fallback below
                    }
                    setStatus({
                        kind: "error",
                        message:
                            detail ||
                            `업로드에 실패했습니다 (HTTP ${res.status}).`,
                    });
                    return;
                }

                const asset = (await res.json()) as UploadedAsset;
                setStatus({ kind: "uploaded", asset });
                onUploaded?.(asset);
            } catch (err) {
                setStatus({
                    kind: "error",
                    message: `업로드 중 오류가 발생했습니다: ${
                        err instanceof Error ? err.message : String(err)
                    }`,
                });
            }
        },
        [onUploaded],
    );

    const onDrop = useCallback(
        (e: React.DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void upload(file);
        },
        [upload],
    );

    const reset = useCallback(() => {
        setStatus({ kind: "idle" });
        onCleared?.();
    }, [onCleared]);

    return (
        <div className="w-full">
            {(status.kind === "idle" ||
                status.kind === "uploading" ||
                status.kind === "error") && (
                <label
                    htmlFor={inputId}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    className={[
                        "block w-full cursor-pointer rounded-xl border-2 border-dashed",
                        compact ? "px-6 py-6" : "px-6 py-12",
                        "text-center transition-colors",
                        isDragging
                            ? "border-primary-500 bg-primary-50"
                            : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50",
                    ].join(" ")}
                >
                    <Upload
                        className={`mx-auto ${compact ? "size-7" : "size-10"} text-neutral-400`}
                        aria-hidden
                    />
                    <p className="mt-4 font-medium text-neutral-700">
                        {status.kind === "uploading"
                            ? `업로드 중… ${status.name}`
                            : "파일을 드래그하거나 클릭하여 선택"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                        {formatsLabel}
                    </p>
                    <input
                        id={inputId}
                        type="file"
                        accept={accept}
                        className="sr-only"
                        disabled={status.kind === "uploading"}
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void upload(f);
                            // Reset the input so the same file can be re-selected later.
                            e.target.value = "";
                        }}
                    />
                </label>
            )}

            {status.kind === "uploaded" && (
                <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <FileText className="size-5 text-primary-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate">
                            {status.asset.original_filename ?? "(이름 없음)"}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                            {(status.asset.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                            {status.asset.mime_type} · asset_id{" "}
                            <code className="font-mono">
                                {status.asset.id.slice(0, 8)}…
                            </code>
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                            저장 키 (ASCII):{" "}
                            <code className="font-mono">
                                {status.asset.storage_key}
                            </code>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={reset}
                        className="rounded-md p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
                        aria-label="다른 파일 선택"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            )}

            {status.kind === "error" && (
                <p className="mt-3 text-sm text-red-600">{status.message}</p>
            )}
        </div>
    );
}
