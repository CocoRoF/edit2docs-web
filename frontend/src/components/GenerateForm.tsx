"use client";

import { Zap, Key, Settings2, Paperclip, LayoutTemplate } from "lucide-react";
import { useState } from "react";

import { withBase } from "@/lib/basePath";

import UploadDropzone, { type UploadedAsset } from "./UploadDropzone";

export interface GenerateFormSubmit {
    jobId: string;
    pptxAssetId: string | null;
}

interface GenerateFormProps {
    onSubmitted: (info: { jobId: string }) => void;
}

type SubmitState =
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "error"; message: string };

type DeckMode = "template_restyle" | "template_extend";

const PPTX_MIME =
    "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export default function GenerateForm({ onSubmitted }: GenerateFormProps) {
    const [outputFormat, setOutputFormat] = useState<"pptx" | "docx" | "xlsx">("pptx");
    const [asset, setAsset] = useState<UploadedAsset | null>(null);
    const [templateAsset, setTemplateAsset] = useState<UploadedAsset | null>(null);
    const [deckMode, setDeckMode] = useState<DeckMode>("template_restyle");
    const [intent, setIntent] = useState("");
    const [lang, setLang] = useState<"ko-KR" | "en-US" | "zh-CN" | "ja-JP">("ko-KR");
    const [style, setStyle] = useState<"general" | "consultant" | "consultant-top">("general");
    const [minPages, setMinPages] = useState(8);
    const [maxPages, setMaxPages] = useState(12);
    const [anthropicKey, setAnthropicKey] = useState("");
    const [openaiKey, setOpenaiKey] = useState("");
    const [enableImages, setEnableImages] = useState(false);
    const [enableNarration, setEnableNarration] = useState(false);
    const [state, setState] = useState<SubmitState>({ kind: "idle" });

    const ready = intent.trim().length >= 4 && anthropicKey.trim().length > 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!ready) return;
        setState({ kind: "submitting" });

        const isPptx = outputFormat === "pptx";
        const body = {
            source_asset_ids: asset ? [asset.id] : [],
            user_intent: intent.trim(),
            output_format: outputFormat,
            target_pages: [minPages, maxPages] as [number, number],
            lang,
            style,
            skip_images: isPptx ? !enableImages : true,
            narrate: isPptx ? enableNarration : false,
            // Template mode (PPTX only): restyle into / extend the upload.
            template_asset_id: isPptx && templateAsset ? templateAsset.id : null,
            deck_mode: isPptx && templateAsset ? deckMode : "new",
        };

        try {
            const res = await fetch(withBase("/api/jobs/generate-deck"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Language": "ko-KR",
                    "X-Anthropic-API-Key": anthropicKey.trim(),
                    ...(enableImages && openaiKey.trim()
                        ? { "X-OpenAI-API-Key": openaiKey.trim() }
                        : {}),
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                let msg = `요청에 실패했습니다 (HTTP ${res.status})`;
                try {
                    const j = (await res.json()) as { error?: { message?: string } };
                    if (j.error?.message) msg = j.error.message;
                } catch {
                    /* ignore */
                }
                setState({ kind: "error", message: msg });
                return;
            }

            const job = (await res.json()) as { id: string };
            // Wipe the BYOK key from React state immediately after the request.
            setAnthropicKey("");
            setOpenaiKey("");
            setState({ kind: "idle" });
            onSubmitted({ jobId: job.id });
        } catch (err) {
            setState({
                kind: "error",
                message: `요청 중 오류: ${
                    err instanceof Error ? err.message : String(err)
                }`,
            });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <Field label="문서 형식" required>
                <div className="grid grid-cols-3 gap-2">
                    {([
                        ["pptx", "PPT", "프레젠테이션"],
                        ["docx", "Word", "보고서·문서"],
                        ["xlsx", "Excel", "표·데이터"],
                    ] as const).map(([value, label, hint]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setOutputFormat(value)}
                            className={
                                "rounded-lg border px-3 py-2.5 text-left transition-colors " +
                                (outputFormat === value
                                    ? "border-primary-500 bg-primary-50"
                                    : "border-neutral-200 hover:border-neutral-300")
                            }
                        >
                            <span className="block text-sm font-semibold text-neutral-900">{label}</span>
                            <span className="block text-[11px] text-neutral-500">{hint}</span>
                        </button>
                    ))}
                </div>
            </Field>

            <Field
                label="작성 의도"
                hint="어떤 문서를 만들지 한 문장으로. 예) Q3 영업 결과 임원 보고."
                required
            >
                <textarea
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Q3 영업 결과 임원 보고. 성장 견인 부문 + 다음 분기 우선순위를 6-10페이지로."
                />
            </Field>

            <Field
                label="Anthropic API 키 (BYOK)"
                hint="이 요청에만 사용하고 저장하지 않습니다. sk-ant-… 로 시작."
                required
                icon={<Key className="size-4" />}
            >
                <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    autoComplete="off"
                    placeholder="sk-ant-…"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
            </Field>

            <details
                className="rounded-lg border border-neutral-200 px-4 py-3"
                open={asset !== null}
            >
                <summary className="flex cursor-pointer items-center gap-2 font-medium text-neutral-800 select-none">
                    <Paperclip className="size-4" />
                    소스 파일 첨부 <span className="text-xs font-normal text-neutral-500">(선택)</span>
                </summary>
                <p className="mt-2 mb-3 text-xs text-neutral-500">
                    소스 없이도 발표 의도만으로 생성할 수 있습니다. 첨부하면 그 내용을 바탕으로 슬라이드를 설계합니다.
                </p>
                <UploadDropzone onUploaded={setAsset} onCleared={() => setAsset(null)} />
            </details>

            {outputFormat === "pptx" && (
            <details
                className="rounded-lg border border-neutral-200 px-4 py-3"
                open={templateAsset !== null}
            >
                <summary className="flex cursor-pointer items-center gap-2 font-medium text-neutral-800 select-none">
                    <LayoutTemplate className="size-4" />
                    템플릿 PPTX <span className="text-xs font-normal text-neutral-500">(선택)</span>
                </summary>
                <p className="mt-2 mb-3 text-xs text-neutral-500">
                    보유한 PPTX를 업로드하면 그 파일의 슬라이드 마스터·테마 색·폰트를
                    그대로 물려받아 생성합니다. 소스 파일과는 별개입니다.
                </p>
                <UploadDropzone
                    inputId="upload-template"
                    accept={PPTX_MIME}
                    formatsLabel="PPTX 전용 (최대 200 MB)"
                    compact
                    onUploaded={setTemplateAsset}
                    onCleared={() => setTemplateAsset(null)}
                />
                {templateAsset && (
                    <fieldset className="mt-4 space-y-2">
                        <legend className="text-sm font-medium text-neutral-800">
                            템플릿 사용 방식
                        </legend>
                        <Radio
                            name="deck-mode"
                            value="template_restyle"
                            checked={deckMode === "template_restyle"}
                            onChange={() => setDeckMode("template_restyle")}
                            label="새 문서 생성 (restyle)"
                            hint="템플릿의 디자인 위에 새 덱을 만듭니다. 원본 슬라이드는 제거됩니다."
                        />
                        <Radio
                            name="deck-mode"
                            value="template_extend"
                            checked={deckMode === "template_extend"}
                            onChange={() => setDeckMode("template_extend")}
                            label="기존 문서에 슬라이드 추가 (extend)"
                            hint="원본 슬라이드를 유지하고, 생성된 슬라이드를 그 뒤에 덧붙입니다."
                        />
                    </fieldset>
                )}
            </details>
            )}

            <details className="rounded-lg border border-neutral-200 px-4 py-3">
                <summary className="flex cursor-pointer items-center gap-2 font-medium text-neutral-800 select-none">
                    <Settings2 className="size-4" />
                    추가 옵션
                </summary>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    <Field label="언어">
                        <select
                            value={lang}
                            onChange={(e) =>
                                setLang(
                                    e.target.value as "ko-KR" | "en-US" | "zh-CN" | "ja-JP",
                                )
                            }
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
                        >
                            <option value="ko-KR">한국어 (ko-KR)</option>
                            <option value="en-US">English (en-US)</option>
                            <option value="zh-CN">简体中文 (zh-CN)</option>
                            <option value="ja-JP">日本語 (ja-JP)</option>
                        </select>
                    </Field>
                    {outputFormat === "pptx" && (
                    <Field label="스타일">
                        <select
                            value={style}
                            onChange={(e) =>
                                setStyle(
                                    e.target.value as
                                        | "general"
                                        | "consultant"
                                        | "consultant-top",
                                )
                            }
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
                        >
                            <option value="general">일반 (general)</option>
                            <option value="consultant">컨설팅 (consultant)</option>
                            <option value="consultant-top">최고급 컨설팅 (consultant-top)</option>
                        </select>
                    </Field>
                    )}
                    {outputFormat === "pptx" && (
                    <Field label="최소 페이지 수">
                        <input
                            type="number"
                            min={2}
                            max={40}
                            value={minPages}
                            onChange={(e) => setMinPages(Number(e.target.value))}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                        />
                    </Field>
                    )}
                    {outputFormat === "pptx" && (
                    <Field label="최대 페이지 수">
                        <input
                            type="number"
                            min={2}
                            max={40}
                            value={maxPages}
                            onChange={(e) => setMaxPages(Number(e.target.value))}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                        />
                    </Field>
                    )}
                    {outputFormat === "pptx" && (
                    <Toggle
                        label="이미지 자동 생성 (OpenAI 필요)"
                        checked={enableImages}
                        onChange={setEnableImages}
                    />
                    )}
                    {outputFormat === "pptx" && (
                    <Toggle
                        label="한국어 내레이션 (Edge-TTS, 무료)"
                        checked={enableNarration}
                        onChange={setEnableNarration}
                    />
                    )}
                    {outputFormat === "pptx" && enableImages && (
                        <Field
                            label="OpenAI API 키 (이미지 생성)"
                            hint="이미지 생성에만 사용, 저장하지 않습니다."
                            full
                        >
                            <input
                                type="password"
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                autoComplete="off"
                                placeholder="sk-…"
                                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono"
                            />
                        </Field>
                    )}
                </div>
            </details>

            {state.kind === "error" && (
                <p className="text-sm text-red-600">{state.message}</p>
            )}

            <button
                type="submit"
                disabled={!ready || state.kind === "submitting"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
                <Zap className="size-4" />
                {state.kind === "submitting" ? "요청 보내는 중…" : "문서 생성 시작"}
            </button>
        </form>
    );
}

function Field({
    label,
    hint,
    required,
    icon,
    children,
    full,
}: {
    label: string;
    hint?: string;
    required?: boolean;
    icon?: React.ReactNode;
    children: React.ReactNode;
    full?: boolean;
}) {
    return (
        <label className={`block space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
            <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
                {icon}
                {label}
                {required && <span className="text-red-500">*</span>}
            </span>
            {children}
            {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
        </label>
    );
}

function Radio({
    name,
    value,
    checked,
    onChange,
    label,
    hint,
}: {
    name: string;
    value: string;
    checked: boolean;
    onChange: () => void;
    label: string;
    hint: string;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-neutral-200 px-3 py-2.5 hover:bg-neutral-50 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={onChange}
                className="mt-0.5 size-4 border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="min-w-0">
                <span className="block text-sm font-medium text-neutral-800">{label}</span>
                <span className="block text-xs text-neutral-500">{hint}</span>
            </span>
        </label>
    );
}

function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700">{label}</span>
        </label>
    );
}
