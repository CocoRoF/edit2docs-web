"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

/**
 * Dependency-free i18n for edit2docs-web.
 *
 * English is the default locale; Korean is a complete first-class locale.
 * The `en` object is the source of truth for the dictionary shape:
 * `type Dict = typeof en` forces `ko` to declare exactly the same keys at
 * compile time, and components access strings via typed member access
 * (`t.studio.working`) so a typo fails the build.
 *
 * Locale detection (first client render):
 *   localStorage("e2d-locale") → navigator.language startsWith("ko") → "en"
 * The server always renders "en" and the real locale resolves in an effect,
 * so there is no hydration mismatch (Korean users see a brief EN flash).
 */

export type Locale = "en" | "ko";

const STORAGE_KEY = "e2d-locale";

/** BCP-47 tag for Accept-Language headers and job `lang` fields. */
export function localeTag(locale: Locale): "en-US" | "ko-KR" {
    return locale === "ko" ? "ko-KR" : "en-US";
}

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

const en = {
    nav: {
        home: "Home",
        generate: "Generate",
        studio: "Studio",
        mcp: "MCP Guide",
    },
    header: {
        languageSwitcher: "Language",
    },
    footer: {
        engineUnavailable: (reason: string) => `engine info unavailable (${reason})`,
    },
    home: {
        kicker: "English-first · full Korean support · AI-agent ready · MIT licensed",
        heroTitle1: "One line of intent,",
        heroTitle2: "a fully editable document",
        heroBody1:
            "Create PPT, Word, and Excel files from nothing but your intent and an Anthropic key.",
        heroBody2:
            "Reference documents (PDF, DOCX, PPTX, …) are optional — the result is a genuinely editable Office document, cleanly typeset in English or Korean.",
        ctaGenerate: "Try it now",
        ctaApi: "REST API docs",
        ctaMcp: "MCP integration guide",
        featuresTitle: "The engine at a glance",
        features: [
            {
                title: "First-class Korean",
                body: "Precise Hangul text-width metrics, OOXML lang=ko-KR, and automatic font fallback across Pretendard / Apple SD Gothic Neo / Malgun Gothic.",
            },
            {
                title: "Truly editable",
                body: "DrawingML shapes, not images. Every text box, chart, and shape stays fully editable in PowerPoint.",
            },
            {
                title: "Your PPTX as a template",
                body: "Upload your own PPTX to inherit its masters, theme colors, and fonts — build a fresh deck on top (restyle) or append new slides to it (extend).",
            },
            {
                title: "Co-edit over chat",
                body: "Upload a PPTX to preview every slide, then ask for edits, additions, and deletions in chat — applied instantly. Try it in the Studio.",
            },
            {
                title: "Automatic imagery",
                body: "The Strategist plans visual assets per slide and sources them via OpenAI / Pexels. Just add your BYOK key.",
            },
            {
                title: "Korean narration",
                body: "Presenter notes synthesized to MP3 with Edge-TTS Korean voices (SunHi · InJoon) and embedded straight into the PPTX.",
            },
            {
                title: "AI-agent ready",
                body: "Exposed as an MCP server. Connect Claude Desktop, Cursor, or your own agent with a single URL.",
            },
            {
                title: "BYOK",
                body: "Your Anthropic / OpenAI API keys travel with each request and are never stored. You stay in control of the cost.",
            },
        ],
        howTitle: "Done in four steps",
        steps: [
            {
                title: "Describe your intent",
                body: "One sentence is enough. Attaching reference documents (PDF, DOCX, PPTX, …) is optional.",
            },
            {
                title: "Tune the options",
                body: "Language · style · page count · image & narration toggles · BYOK Anthropic key.",
            },
            {
                title: "Watch it generate",
                body: "Every stage (convert → strategize → build pages → quality check → export) streams live over SSE.",
            },
            {
                title: "Download the file",
                body: "Original filenames preserved — Korean included. Every element stays click-to-edit in PowerPoint.",
            },
        ],
        mcpKicker: "AI agent integration",
        mcpTitle: "Connect with a single MCP URL",
        mcpBodyPrefix: "Once Claude Desktop, Cursor, or your own agent registers",
        mcpBodySuffix:
            "as a tool, it can generate, preview, and download decks right away.",
        mcpCta: "See how to connect",
    },
    notFound: {
        title: "Page not found",
        body: "Please check the URL and try again.",
        home: "Back to home",
    },
    generate: {
        title: "Generate a document",
        titleInProgress: "Generating",
        subtitle:
            "All you need is your intent and an Anthropic key. A source file is optional.",
        subtitleInProgress:
            "Progress streams in live. When it finishes, the result document and preview will appear.",
        doneTitle: "Generation complete",
        failedTitle: "The job failed",
        redirecting: "Taking you to the results page…",
    },
    form: {
        formatLabel: "Document format",
        formatPptxHint: "Presentation",
        formatDocxHint: "Reports & docs",
        formatXlsxHint: "Tables & data",
        intentLabel: "Writing intent",
        intentHint:
            "One sentence describing the document you want. e.g. Q3 sales results for the executive team.",
        intentPlaceholder:
            "Q3 sales results for the executive team. Growth drivers + next-quarter priorities in 6-10 pages.",
        anthropicKeyLabel: "Anthropic API key (BYOK)",
        anthropicKeyHint:
            "Used for this request only and never stored. Starts with sk-ant-…",
        sourceSummary: "Attach a source file",
        optionalTag: "(optional)",
        sourceHint:
            "You can generate from intent alone. If you attach a file, the document is designed around its content.",
        templateSummary: "Template PPTX",
        templateHint:
            "Upload your own PPTX and generation inherits its slide masters, theme colors, and fonts. Separate from the source file.",
        templateFormats: "PPTX only (max 200 MB)",
        templateModeLegend: "How to use the template",
        restyleLabel: "Create a new deck (restyle)",
        restyleHint:
            "Builds a new deck on top of the template's design. The original slides are removed.",
        extendLabel: "Append slides to the deck (extend)",
        extendHint:
            "Keeps the original slides and appends the generated slides after them.",
        moreOptions: "More options",
        langLabel: "Language",
        styleLabel: "Style",
        styleGeneral: "General",
        styleConsultant: "Consulting",
        styleConsultantTop: "Top-tier consulting",
        minPages: "Minimum pages",
        maxPages: "Maximum pages",
        imagesToggle: "Auto-generate images (requires OpenAI)",
        narrationToggle: "Korean narration (Edge-TTS, free)",
        openaiKeyLabel: "OpenAI API key (image generation)",
        openaiKeyHint: "Used only for image generation; never stored.",
        submitting: "Sending request…",
        submit: "Start generating",
    },
    errors: {
        requestFailed: (status: number) => `The request failed (HTTP ${status}).`,
        requestError: (message: string) => `Request error: ${message}`,
    },
    upload: {
        tooLarge: (mb: string) => `File is too large (${mb} MB > 200 MB).`,
        failed: (status: number) => `Upload failed (HTTP ${status}).`,
        error: (message: string) => `An error occurred while uploading: ${message}`,
        uploading: (name: string) => `Uploading… ${name}`,
        dropOrClick: "Drag a file here or click to browse",
        defaultFormats: "PDF · DOCX · PPTX · XLSX · HTML · EPUB (max 200 MB)",
        unnamed: "(unnamed)",
        storageKey: "Storage key (ASCII):",
        chooseAnother: "Choose another file",
    },
    timeline: {
        title: "Progress",
        disconnected: "Disconnected",
        live: "Live",
        closed: "Closed",
        waiting: "Waiting",
    },
    stages: {
        queued: "Queued",
        converting: "Converting sources",
        analyzing_template: "Analyzing template PPTX",
        strategizing: "Planning the design",
        acquiring_images: "Acquiring images",
        executing_pages: "Building pages",
        checking_quality: "Checking quality",
        narrating: "Synthesizing narration",
        exporting: "Building the document",
        analyzing_deck: "Rendering the deck",
        planning_edits: "Planning the edits",
        editing_slides: "Editing slides",
        applying_edits: "Applying changes",
        done: "Done",
        failed: "Failed",
    },
    status: {
        queued: "Queued",
        running: "Running",
        done: "Done",
        failed: "Failed",
        cancelled: "Cancelled",
    },
    quality: {
        title: "Quality check results",
        counts: (errors: number, warnings: number, infos: number) =>
            `${errors} errors · ${warnings} warnings · ${infos} info`,
        severity: {
            error: "Error",
            warning: "Warning",
            info: "Info",
        },
    },
    job: {
        fetchFailed: (status: number) => `Failed to fetch the job: HTTP ${status}`,
        fetchError: (message: string) => `Error fetching the job: ${message}`,
        title: "Job result",
        newJob: "+ New job",
        loading: "Loading job details…",
        statusLabel: "Status",
        errorMessage: "Error message:",
        langField: "Language",
        styleField: "Style",
        pagesField: "Pages",
        durationField: "Generation time",
        seconds: (n: number) => `${n}s`,
        downloadTitle: (format: string) => `Download ${format}`,
        downloadHintPages: (n: number) =>
            `${n} pages — the original filename (Korean included) is preserved.`,
        downloadHint: "The original filename (Korean included) is preserved.",
        downloadCta: (format: string) => `Get ${format}`,
        designSpec: "Strategist design spec",
        detectedLangs: "Detected languages:",
        specLock: "spec_lock.yaml (execution contract)",
        costTitle: "Cost / usage",
        costInputTokens: "Input tokens",
        costOutputTokens: "Output tokens",
        costCacheRead: "Cache read tokens",
        costCacheWrite: "Cache write tokens",
        costImages: "Images",
        costAudioSeconds: "Audio synthesis (s)",
        costWallSeconds: "Wall clock (s)",
    },
    studio: {
        title: "Co-editing studio",
        previewFailed: (status: number) =>
            `Preview rendering failed (HTTP ${status}).`,
        previewError: (message: string) => `Preview request error: ${message}`,
        undone: "Reverted to the previous version.",
        resultFetchFailed:
            "Could not fetch the job result. Please try again in a moment.",
        editFailed: (message: string) => `The edit failed: ${message}`,
        unknownError: "unknown error",
        processed: "Your request has been handled.",
        attachmentPrefix: "[Attached]",
        fileFallback: "file",
        noDeck: "No document loaded.",
        textEditFailed: (status: number) => `Edit failed (HTTP ${status})`,
        staleSlide:
            "The slide has already changed. The preview was refreshed — please try again.",
        notApplied: "The edit could not be applied.",
        textEditError: (message: string) => `Error while editing: ${message}`,
        working: "Working…",
        emptyTitle: "Upload a document and edit it in chat",
        emptyBody:
            "Upload a PPT, Word, or Excel file to get a preview, then ask for edits, additions, and deletions in chat. PPTs also support instant editing by double-clicking text. Every edit creates a new version, so you can undo and download at any time.",
        uploadFormats: "PPTX · DOCX · XLSX (max 200 MB)",
    },
    canvas: {
        undo: "Undo",
        download: "Download",
        otherFile: "New file",
        applying: "Applying edits…",
        refreshing: "Refreshing preview…",
    },
    slides: {
        count: (n: number) => `${n} slides`,
        dblClickHint: "Double-click any text to edit it in place",
        zoomOut: "Zoom out",
        zoomReset: "Reset to 100%",
        zoomIn: "Zoom in",
        previewFailed: "Could not load the preview.",
        editorTitle: (n: number) => `Edit text — slide ${n}`,
        cancelEsc: "Cancel (Esc)",
        saveEnter: "Save (Enter)",
    },
    chat: {
        modelOpus: "Claude Opus 4.7 (default)",
        modelSonnet: "Claude Sonnet 4.6 (fast)",
        ops: {
            edit: "Edit",
            add: "Add",
            delete: "Delete",
            replace: "Replace",
            insert_after: "Insert",
            set_cell: "Edit cell",
            append_rows: "Append rows",
            add_sheet: "Add sheet",
        },
        slideRef: (n: number) => `p${n}`,
        afterRef: (n: number) => `after p${n}`,
        attachTooLarge: "The file exceeds 200 MB.",
        attachUploadFailed: (status: number) =>
            `Attachment upload failed (HTTP ${status})`,
        attachError: (message: string) => `Error attaching file: ${message}`,
        settings: "Settings",
        keyRequired: "API key required",
        anthropicKeyLabel: "Anthropic API key (BYOK)",
        keyHint:
            "Used only for edit requests and never stored. You'll need to re-enter it after a refresh.",
        modelLabel: "Model",
        langLabel: "Language",
        examplesTitle: "Try asking things like",
        example1: "PPT: Change the slide 3 title to 'Q3 results summary'",
        example2:
            "Word: Fix the figure in paragraph 2 to 15% and add a summary section",
        example3: "Excel: Set cell B3 to 142 and add a Q3 row",
        example4: 'Attach a document and say "fold this content in"',
        example5: "How is this document structured? (questions are fine too)",
        tipPrefix: "Tip: in a PPT, ",
        tipStrong: "double-click",
        tipSuffix:
            " any text on the canvas to edit it instantly — no AI round-trip.",
        dropHere: "Drop reference documents here",
        removeAttachment: "Remove attachment",
        uploading: "Uploading…",
        placeholderNoDeck: "Upload a document first (PPTX · DOCX · XLSX)",
        placeholderBusy: "Applying edits…",
        placeholderAttach:
            "What should we do with the attachment? (e.g. fill slide 5 with this content)",
        placeholder:
            "How should we change the document? (Enter to send, Shift+Enter for a new line; drag files or use the clip button for references)",
        attachTitle:
            "Attach reference documents (PDF, DOCX, PPTX, … — drag & drop works too)",
        attachDisabledTitle: "Upload a document before attaching references",
        send: "Send",
        sendKeyFirst: "Enter your Anthropic API key in Settings first",
        sendUploading: "Waiting for attachments to finish uploading…",
        replyKo: "Korean replies",
        replyEn: "English replies",
        newVersionPerEdit: "A new version per edit",
        keyNeededHint: "API key required — set it in Settings",
    },
    events: {
        streamDisconnected: "The stream disconnected. Reconnecting…",
    },
    mcpDocs: {
        title: "MCP Integration Guide",
        intro: "The edit2docs server exposes two MCP transports.",
        configHeading: "Claude Desktop / Cursor configuration example",
        fullGuide: "Full guide:",
    },
};

/** Dictionary shape, derived from `en` — `ko` must match it exactly. */
export type Dict = typeof en;

const ko: Dict = {
    nav: {
        home: "홈",
        generate: "지금 만들기",
        studio: "같이 만들기",
        mcp: "MCP 가이드",
    },
    header: {
        languageSwitcher: "언어",
    },
    footer: {
        engineUnavailable: (reason: string) => `engine 정보 없음 (${reason})`,
    },
    home: {
        kicker: "한국어 네이티브 · AI Agent 호환 · MIT 라이선스",
        heroTitle1: "주제 한 줄이면",
        heroTitle2: "편집 가능한 문서",
        heroBody1: "작성 의도와 Anthropic 키만으로 PPT·Word·Excel을 만들 수 있습니다.",
        heroBody2:
            "참고 문서(PDF·DOCX·PPTX·…)는 선택이며, 결과는 Pretendard로 조판된 진짜 편집 가능한 한국어 오피스 문서입니다.",
        ctaGenerate: "지금 만들어보기",
        ctaApi: "REST API 문서",
        ctaMcp: "MCP 연결 가이드",
        featuresTitle: "엔진 한 장 요약",
        features: [
            {
                title: "한국어 우선",
                body: "Hangul 텍스트 폭 정확 계산, OOXML lang=ko-KR, Pretendard / Apple SD Gothic Neo / Malgun Gothic 자동 폰트 폴백.",
            },
            {
                title: "진짜 편집 가능",
                body: "이미지가 아닌 DrawingML 도형. PowerPoint에서 모든 텍스트·차트·도형을 그대로 편집.",
            },
            {
                title: "내 PPTX 를 템플릿으로",
                body: "보유한 PPTX 를 업로드하면 마스터·테마 색·폰트를 물려받아 새 덱을 만들거나(restyle), 기존 덱 뒤에 슬라이드를 추가(extend).",
            },
            {
                title: "채팅으로 같이 만들기",
                body: "PPTX 를 올리면 전 슬라이드가 미리보기로 뜨고, 채팅으로 수정·추가·삭제를 요청하면 즉시 반영됩니다. 스튜디오에서 사용해 보세요.",
            },
            {
                title: "이미지 자동 생성",
                body: "Strategist가 슬라이드별 시각 자산을 계획하고 OpenAI / Pexels 로 자동 확보. BYOK 키만 추가.",
            },
            {
                title: "한국어 내레이션",
                body: "Edge-TTS 의 한국어 음성 (SunHi · InJoon) 으로 발표자 노트를 MP3 로 합성해 PPTX 안에 자동 임베드.",
            },
            {
                title: "AI Agent 호환",
                body: "MCP 서버 노출. Claude Desktop / Cursor / 자체 Agent 에서 URL 한 줄로 연결.",
            },
            {
                title: "BYOK",
                body: "Anthropic / OpenAI API 키는 요청마다 가져오고 저장하지 않습니다. 비용도 사용자 부담.",
            },
        ],
        howTitle: "4단계로 끝",
        steps: [
            {
                title: "발표 의도 입력",
                body: "한 문장이면 충분합니다. 참고 문서(PDF·DOCX·PPTX·…) 첨부는 선택.",
            },
            {
                title: "옵션 조정",
                body: "언어 · 스타일 · 페이지 수 · 이미지·내레이션 토글 · BYOK Anthropic 키.",
            },
            {
                title: "실시간 생성",
                body: "각 단계 (변환 → 전략 → 페이지 생성 → 품질 검사 → 빌드) 가 SSE 로 실시간 스트리밍.",
            },
            {
                title: "PPTX 다운로드",
                body: "한글 파일명 그대로. PowerPoint 에서 모든 요소를 클릭하여 편집 가능.",
            },
        ],
        mcpKicker: "AI Agent 통합",
        mcpTitle: "MCP URL 한 줄로 연결",
        mcpBodyPrefix: "Claude Desktop · Cursor · 자체 Agent 가",
        mcpBodySuffix: "를 도구로 등록하면 즉시 PPT 생성·미리보기·다운로드가 가능합니다.",
        mcpCta: "연결 방법 보기",
    },
    notFound: {
        title: "요청하신 페이지를 찾을 수 없습니다",
        body: "경로를 다시 확인해주세요.",
        home: "홈으로",
    },
    generate: {
        title: "문서 생성",
        titleInProgress: "생성 진행 중",
        subtitle: "발표 의도와 Anthropic 키만 있으면 시작할 수 있습니다. 소스 파일은 선택입니다.",
        subtitleInProgress:
            "진행 상황을 실시간으로 받아옵니다. 완료되면 결과 문서와 미리보기가 나타납니다.",
        doneTitle: "생성이 완료되었습니다",
        failedTitle: "작업이 실패했습니다",
        redirecting: "결과 페이지로 이동합니다…",
    },
    form: {
        formatLabel: "문서 형식",
        formatPptxHint: "프레젠테이션",
        formatDocxHint: "보고서·문서",
        formatXlsxHint: "표·데이터",
        intentLabel: "작성 의도",
        intentHint: "어떤 문서를 만들지 한 문장으로. 예) Q3 영업 결과 임원 보고.",
        intentPlaceholder:
            "Q3 영업 결과 임원 보고. 성장 견인 부문 + 다음 분기 우선순위를 6-10페이지로.",
        anthropicKeyLabel: "Anthropic API 키 (BYOK)",
        anthropicKeyHint: "이 요청에만 사용하고 저장하지 않습니다. sk-ant-… 로 시작.",
        sourceSummary: "소스 파일 첨부",
        optionalTag: "(선택)",
        sourceHint:
            "소스 없이도 작성 의도만으로 생성할 수 있습니다. 첨부하면 그 내용을 바탕으로 문서를 설계합니다.",
        templateSummary: "템플릿 PPTX",
        templateHint:
            "보유한 PPTX를 업로드하면 그 파일의 슬라이드 마스터·테마 색·폰트를 그대로 물려받아 생성합니다. 소스 파일과는 별개입니다.",
        templateFormats: "PPTX 전용 (최대 200 MB)",
        templateModeLegend: "템플릿 사용 방식",
        restyleLabel: "새 문서 생성 (restyle)",
        restyleHint: "템플릿의 디자인 위에 새 덱을 만듭니다. 원본 슬라이드는 제거됩니다.",
        extendLabel: "기존 문서에 슬라이드 추가 (extend)",
        extendHint: "원본 슬라이드를 유지하고, 생성된 슬라이드를 그 뒤에 덧붙입니다.",
        moreOptions: "추가 옵션",
        langLabel: "언어",
        styleLabel: "스타일",
        styleGeneral: "일반 (general)",
        styleConsultant: "컨설팅 (consultant)",
        styleConsultantTop: "최고급 컨설팅 (consultant-top)",
        minPages: "최소 페이지 수",
        maxPages: "최대 페이지 수",
        imagesToggle: "이미지 자동 생성 (OpenAI 필요)",
        narrationToggle: "한국어 내레이션 (Edge-TTS, 무료)",
        openaiKeyLabel: "OpenAI API 키 (이미지 생성)",
        openaiKeyHint: "이미지 생성에만 사용, 저장하지 않습니다.",
        submitting: "요청 보내는 중…",
        submit: "문서 생성 시작",
    },
    errors: {
        requestFailed: (status: number) => `요청에 실패했습니다 (HTTP ${status}).`,
        requestError: (message: string) => `요청 중 오류: ${message}`,
    },
    upload: {
        tooLarge: (mb: string) => `파일이 너무 큽니다 (${mb} MB > 200 MB).`,
        failed: (status: number) => `업로드에 실패했습니다 (HTTP ${status}).`,
        error: (message: string) => `업로드 중 오류가 발생했습니다: ${message}`,
        uploading: (name: string) => `업로드 중… ${name}`,
        dropOrClick: "파일을 드래그하거나 클릭하여 선택",
        defaultFormats: "PDF · DOCX · PPTX · XLSX · HTML · EPUB (최대 200 MB)",
        unnamed: "(이름 없음)",
        storageKey: "저장 키 (ASCII):",
        chooseAnother: "다른 파일 선택",
    },
    timeline: {
        title: "진행 상황",
        disconnected: "연결 끊김",
        live: "라이브",
        closed: "종료됨",
        waiting: "대기 중",
    },
    stages: {
        queued: "작업 대기",
        converting: "소스 변환 중",
        analyzing_template: "템플릿 PPTX 분석 중",
        strategizing: "디자인 전략 수립 중",
        acquiring_images: "이미지 확보 중",
        executing_pages: "페이지 생성 중",
        checking_quality: "품질 검사 중",
        narrating: "내레이션 합성 중",
        exporting: "문서 빌드 중",
        analyzing_deck: "덱 렌더링 중",
        planning_edits: "편집 계획 수립 중",
        editing_slides: "슬라이드 편집 중",
        applying_edits: "문서 반영 중",
        done: "완료",
        failed: "실패",
    },
    status: {
        queued: "대기 중",
        running: "진행 중",
        done: "완료",
        failed: "실패",
        cancelled: "취소됨",
    },
    quality: {
        title: "품질 검사 결과",
        counts: (errors: number, warnings: number, infos: number) =>
            `오류 ${errors} · 경고 ${warnings} · 정보 ${infos}`,
        severity: {
            error: "오류",
            warning: "경고",
            info: "정보",
        },
    },
    job: {
        fetchFailed: (status: number) => `작업 조회 실패: HTTP ${status}`,
        fetchError: (message: string) => `작업 조회 중 오류: ${message}`,
        title: "작업 결과",
        newJob: "+ 새 작업",
        loading: "작업 정보를 불러오는 중…",
        statusLabel: "상태",
        errorMessage: "오류 메시지:",
        langField: "언어",
        styleField: "스타일",
        pagesField: "페이지 수",
        durationField: "생성 시간",
        seconds: (n: number) => `${n}초`,
        downloadTitle: (format: string) => `${format} 다운로드`,
        downloadHintPages: (n: number) => `${n}페이지 — 한글 파일명이 그대로 보존됩니다.`,
        downloadHint: "한글 파일명이 그대로 보존됩니다.",
        downloadCta: (format: string) => `${format} 받기`,
        designSpec: "Strategist 디자인 스펙",
        detectedLangs: "감지 언어:",
        specLock: "spec_lock.yaml (실행 계약)",
        costTitle: "비용 / 사용량",
        costInputTokens: "입력 토큰",
        costOutputTokens: "출력 토큰",
        costCacheRead: "캐시 읽기 토큰",
        costCacheWrite: "캐시 쓰기 토큰",
        costImages: "이미지 수",
        costAudioSeconds: "오디오 합성 (초)",
        costWallSeconds: "벽시계 (초)",
    },
    studio: {
        title: "문서 같이 만들기",
        previewFailed: (status: number) =>
            `미리보기 렌더링에 실패했습니다 (HTTP ${status}).`,
        previewError: (message: string) => `미리보기 요청 중 오류: ${message}`,
        undone: "이전 버전으로 되돌렸습니다.",
        resultFetchFailed: "작업 결과를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        editFailed: (message: string) => `편집에 실패했습니다: ${message}`,
        unknownError: "알 수 없는 오류",
        processed: "요청을 처리했습니다.",
        attachmentPrefix: "[첨부]",
        fileFallback: "파일",
        noDeck: "덱이 없습니다.",
        textEditFailed: (status: number) => `수정 실패 (HTTP ${status})`,
        staleSlide: "슬라이드가 이미 변경되었습니다. 미리보기를 갱신했으니 다시 시도하세요.",
        notApplied: "수정을 적용하지 못했습니다.",
        textEditError: (message: string) => `수정 중 오류: ${message}`,
        working: "작업 중…",
        emptyTitle: "문서를 올리고 채팅으로 편집하세요",
        emptyBody:
            "PPT·Word·Excel을 업로드하면 미리보기가 나타나고, 채팅으로 수정·추가·삭제를 요청할 수 있습니다. PPT는 텍스트 더블클릭 즉시 수정도 지원합니다. 편집마다 새 버전이 만들어져 언제든 되돌리고 다운로드할 수 있습니다.",
        uploadFormats: "PPTX · DOCX · XLSX (최대 200 MB)",
    },
    canvas: {
        undo: "되돌리기",
        download: "다운로드",
        otherFile: "다른 파일",
        applying: "편집 반영 중…",
        refreshing: "미리보기 갱신 중…",
    },
    slides: {
        count: (n: number) => `${n}장`,
        dblClickHint: "텍스트 더블클릭으로 바로 편집",
        zoomOut: "축소",
        zoomReset: "100%로",
        zoomIn: "확대",
        previewFailed: "미리보기를 불러오지 못했습니다.",
        editorTitle: (n: number) => `텍스트 편집 — 슬라이드 ${n}`,
        cancelEsc: "취소 (Esc)",
        saveEnter: "저장 (Enter)",
    },
    chat: {
        modelOpus: "Claude Opus 4.7 (기본)",
        modelSonnet: "Claude Sonnet 4.6 (빠름)",
        ops: {
            edit: "수정",
            add: "추가",
            delete: "삭제",
            replace: "교체",
            insert_after: "삽입",
            set_cell: "셀 수정",
            append_rows: "행 추가",
            add_sheet: "시트 추가",
        },
        slideRef: (n: number) => `${n}p`,
        afterRef: (n: number) => `${n}p 뒤`,
        attachTooLarge: "파일이 200 MB를 초과합니다.",
        attachUploadFailed: (status: number) => `첨부 업로드 실패 (HTTP ${status})`,
        attachError: (message: string) => `첨부 중 오류: ${message}`,
        settings: "설정",
        keyRequired: "API 키 필요",
        anthropicKeyLabel: "Anthropic API 키 (BYOK)",
        keyHint: "편집 요청에만 사용하며 저장하지 않습니다. 새로고침하면 다시 입력해야 합니다.",
        modelLabel: "모델",
        langLabel: "언어",
        examplesTitle: "이렇게 요청해 보세요",
        example1: "PPT: 3번 슬라이드 제목을 'Q3 실적 요약'으로 바꿔줘",
        example2: "Word: 2번 문단 수치를 15%로 고치고 요약 섹션 추가해줘",
        example3: "Excel: B3 셀을 142로 바꾸고 3분기 행을 추가해줘",
        example4: "문서를 첨부하고 “이 내용을 반영해줘”",
        example5: "이 문서 구성이 어떻게 돼? (질문만 해도 됩니다)",
        tipPrefix: "팁: PPT는 캔버스에서 텍스트를 ",
        tipStrong: "더블클릭",
        tipSuffix: "하면 AI 없이 즉시 수정됩니다.",
        dropHere: "참고 문서를 여기에 떨어뜨리세요",
        removeAttachment: "첨부 제거",
        uploading: "업로드 중…",
        placeholderNoDeck: "먼저 문서 파일을 업로드하세요 (PPTX·DOCX·XLSX)",
        placeholderBusy: "편집 반영 중…",
        placeholderAttach: "첨부한 문서로 무엇을 할까요? (예: 이 내용으로 5번 슬라이드 채워줘)",
        placeholder:
            "문서를 어떻게 바꿀까요? (Enter 전송, Shift+Enter 줄바꿈, 참고자료: 드래그/클립 버튼)",
        attachTitle: "참고 문서 첨부 (PDF·DOCX·PPTX·… / 드래그로도 가능)",
        attachDisabledTitle: "덱을 업로드한 뒤 첨부할 수 있습니다",
        send: "전송",
        sendKeyFirst: "설정에서 Anthropic API 키를 먼저 입력하세요",
        sendUploading: "첨부 업로드 완료 대기 중…",
        replyKo: "한국어 응답",
        replyEn: "영어 응답",
        newVersionPerEdit: "편집마다 새 버전 생성",
        keyNeededHint: "API 키 필요 — 설정에서 입력",
    },
    events: {
        streamDisconnected: "스트림 연결이 끊겼습니다. 재연결 중…",
    },
    mcpDocs: {
        title: "MCP 연결 가이드",
        intro: "edit2docs 서버는 두 가지 MCP 트랜스포트를 노출합니다.",
        configHeading: "Claude Desktop / Cursor 설정 예시",
        fullGuide: "상세 가이드:",
    },
};

const DICTS: Record<Locale, Dict> = { en, ko };

// ---------------------------------------------------------------------------
// Context + hooks
// ---------------------------------------------------------------------------

interface LocaleContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Dict;
}

const LocaleContext = createContext<LocaleContextValue>({
    locale: "en",
    setLocale: () => undefined,
    t: en,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    // Always render "en" first (matches the server render), then resolve the
    // real locale in an effect. Korean users see a brief EN flash on first
    // paint — the accepted trade-off for zero hydration mismatches.
    const [locale, setLocaleState] = useState<Locale>("en");

    useEffect(() => {
        let detected: Locale = "en";
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored === "en" || stored === "ko") {
                detected = stored;
            } else if (window.navigator.language?.toLowerCase().startsWith("ko")) {
                detected = "ko";
            }
        } catch {
            // localStorage can throw in privacy modes — fall back to "en".
        }
        setLocaleState(detected);
    }, []);

    // Keep <html lang> in sync with the active locale.
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Persisting is best-effort.
        }
    }, []);

    return (
        <LocaleContext.Provider value={{ locale, setLocale, t: DICTS[locale] }}>
            {children}
        </LocaleContext.Provider>
    );
}

/** Active locale + setter (persists the choice and updates <html lang>). */
export function useLocale(): {
    locale: Locale;
    setLocale: (locale: Locale) => void;
} {
    const { locale, setLocale } = useContext(LocaleContext);
    return { locale, setLocale };
}

/** The active dictionary — typed member access only (t.studio.working). */
export function useT(): Dict {
    return useContext(LocaleContext).t;
}
