"use client";

import { Zap, Key, Settings2, Paperclip, LayoutTemplate } from "lucide-react";
import { useState } from "react";

import { withBase } from "@/lib/basePath";
import { localeTag, useLocale, useT } from "@/lib/i18n";

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

type JobLang = "ko-KR" | "en-US" | "zh-CN" | "ja-JP";

const PPTX_MIME =
    "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export default function GenerateForm({ onSubmitted }: GenerateFormProps) {
    const t = useT();
    const { locale } = useLocale();
    const [outputFormat, setOutputFormat] = useState<"pptx" | "docx" | "xlsx">("pptx");
    const [asset, setAsset] = useState<UploadedAsset | null>(null);
    const [templateAsset, setTemplateAsset] = useState<UploadedAsset | null>(null);
    const [deckMode, setDeckMode] = useState<DeckMode>("template_restyle");
    const [intent, setIntent] = useState("");
    // null = follow the active UI locale; set once the user picks explicitly.
    const [langChoice, setLangChoice] = useState<JobLang | null>(null);
    const [style, setStyle] = useState<"general" | "consultant" | "consultant-top">("general");
    const [minPages, setMinPages] = useState(8);
    const [maxPages, setMaxPages] = useState(12);
    const [anthropicKey, setAnthropicKey] = useState("");
    const [openaiKey, setOpenaiKey] = useState("");
    const [enableImages, setEnableImages] = useState(false);
    const [enableNarration, setEnableNarration] = useState(false);
    const [state, setState] = useState<SubmitState>({ kind: "idle" });

    const lang: JobLang = langChoice ?? localeTag(locale);
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
                    "Accept-Language": localeTag(locale),
                    "X-Anthropic-API-Key": anthropicKey.trim(),
                    ...(enableImages && openaiKey.trim()
                        ? { "X-OpenAI-API-Key": openaiKey.trim() }
                        : {}),
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                let msg = t.errors.requestFailed(res.status);
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
                message: t.errors.requestError(
                    err instanceof Error ? err.message : String(err),
                ),
            });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <Field label={t.form.formatLabel} required>
                <div className="grid grid-cols-3 gap-2">
                    {([
                        ["pptx", "PPT", t.form.formatPptxHint],
                        ["docx", "Word", t.form.formatDocxHint],
                        ["xlsx", "Excel", t.form.formatXlsxHint],
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
                label={t.form.intentLabel}
                hint={t.form.intentHint}
                required
            >
                <textarea
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={t.form.intentPlaceholder}
                />
            </Field>

            <Field
                label={t.form.anthropicKeyLabel}
                hint={t.form.anthropicKeyHint}
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
                    {t.form.sourceSummary}{" "}
                    <span className="text-xs font-normal text-neutral-500">{t.form.optionalTag}</span>
                </summary>
                <p className="mt-2 mb-3 text-xs text-neutral-500">
                    {t.form.sourceHint}
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
                    {t.form.templateSummary}{" "}
                    <span className="text-xs font-normal text-neutral-500">{t.form.optionalTag}</span>
                </summary>
                <p className="mt-2 mb-3 text-xs text-neutral-500">
                    {t.form.templateHint}
                </p>
                <UploadDropzone
                    inputId="upload-template"
                    accept={PPTX_MIME}
                    formatsLabel={t.form.templateFormats}
                    compact
                    onUploaded={setTemplateAsset}
                    onCleared={() => setTemplateAsset(null)}
                />
                {templateAsset && (
                    <fieldset className="mt-4 space-y-2">
                        <legend className="text-sm font-medium text-neutral-800">
                            {t.form.templateModeLegend}
                        </legend>
                        <Radio
                            name="deck-mode"
                            value="template_restyle"
                            checked={deckMode === "template_restyle"}
                            onChange={() => setDeckMode("template_restyle")}
                            label={t.form.restyleLabel}
                            hint={t.form.restyleHint}
                        />
                        <Radio
                            name="deck-mode"
                            value="template_extend"
                            checked={deckMode === "template_extend"}
                            onChange={() => setDeckMode("template_extend")}
                            label={t.form.extendLabel}
                            hint={t.form.extendHint}
                        />
                    </fieldset>
                )}
            </details>
            )}

            <details className="rounded-lg border border-neutral-200 px-4 py-3">
                <summary className="flex cursor-pointer items-center gap-2 font-medium text-neutral-800 select-none">
                    <Settings2 className="size-4" />
                    {t.form.moreOptions}
                </summary>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    <Field label={t.form.langLabel}>
                        <select
                            value={lang}
                            onChange={(e) => setLangChoice(e.target.value as JobLang)}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
                        >
                            {/* Locale-native labels by design. */}
                            <option value="en-US">English (en-US)</option>
                            <option value="ko-KR">한국어 (ko-KR)</option>
                            <option value="zh-CN">简体中文 (zh-CN)</option>
                            <option value="ja-JP">日本語 (ja-JP)</option>
                        </select>
                    </Field>
                    {outputFormat === "pptx" && (
                    <Field label={t.form.styleLabel}>
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
                            <option value="general">{t.form.styleGeneral}</option>
                            <option value="consultant">{t.form.styleConsultant}</option>
                            <option value="consultant-top">{t.form.styleConsultantTop}</option>
                        </select>
                    </Field>
                    )}
                    {outputFormat === "pptx" && (
                    <Field label={t.form.minPages}>
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
                    <Field label={t.form.maxPages}>
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
                        label={t.form.imagesToggle}
                        checked={enableImages}
                        onChange={setEnableImages}
                    />
                    )}
                    {outputFormat === "pptx" && (
                    <Toggle
                        label={t.form.narrationToggle}
                        checked={enableNarration}
                        onChange={setEnableNarration}
                    />
                    )}
                    {outputFormat === "pptx" && enableImages && (
                        <Field
                            label={t.form.openaiKeyLabel}
                            hint={t.form.openaiKeyHint}
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
                {state.kind === "submitting" ? t.form.submitting : t.form.submit}
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
