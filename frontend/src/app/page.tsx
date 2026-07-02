import Link from "next/link";
import {
    FileText,
    Zap,
    Plug,
    Languages,
    LayoutTemplate,
    MessageSquareText,
    Mic,
    Image as ImageIcon,
    Code2,
    ShieldCheck,
} from "lucide-react";

/**
 * edit2docs-web home / demo entry point.
 *
 * Three-section layout:
 *  1. Hero with primary CTAs
 *  2. Feature grid (six tiles — what the engine actually does)
 *  3. How-it-works flow (4 numbered steps + screenshot placeholders)
 *  4. MCP integration callout
 */
export default function Home() {
    return (
        <main className="flex-1 flex flex-col items-center px-6 w-full">
            <Hero />
            <Features />
            <HowItWorks />
            <McpCallout />
        </main>
    );
}

// ---------------------------------------------------------------------------

function Hero() {
    return (
        <section className="text-center max-w-3xl mt-16 sm:mt-24">
            <p className="text-sm font-medium text-primary-600 mb-3">
                한국어 네이티브 · AI Agent 호환 · MIT 라이선스
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900">
                주제 한 줄이면
                <br />
                편집 가능한 문서
            </h1>
            <p className="mt-6 text-lg text-neutral-600 leading-relaxed">
                작성 의도와 Anthropic 키만으로 PPT·Word·Excel을 만들 수 있습니다. <br />
                참고 문서(PDF·DOCX·PPTX·…)는 선택이며, 결과는 Pretendard로 조판된 진짜 편집 가능한 한국어 오피스 문서입니다.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Link
                    href="/generate"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-white font-medium shadow-sm hover:bg-primary-700 transition-colors"
                >
                    <Zap className="size-4" />
                    지금 만들어보기
                </Link>
                <a
                    href="/edit2docs-api/docs"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-5 py-3 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                    <FileText className="size-4" />
                    REST API 문서
                </a>
                <Link
                    href="/docs/mcp"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-5 py-3 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                    <Plug className="size-4" />
                    MCP 연결 가이드
                </Link>
            </div>
        </section>
    );
}

function Features() {
    const items: Array<[React.ReactNode, string, string]> = [
        [
            <Languages key="i" className="size-5 text-primary-600" />,
            "한국어 우선",
            "Hangul 텍스트 폭 정확 계산, OOXML lang=ko-KR, Pretendard / Apple SD Gothic Neo / Malgun Gothic 자동 폰트 폴백.",
        ],
        [
            <FileText key="i" className="size-5 text-primary-600" />,
            "진짜 편집 가능",
            "이미지가 아닌 DrawingML 도형. PowerPoint에서 모든 텍스트·차트·도형을 그대로 편집.",
        ],
        [
            <LayoutTemplate key="i" className="size-5 text-primary-600" />,
            "내 PPTX 를 템플릿으로",
            "보유한 PPTX 를 업로드하면 마스터·테마 색·폰트를 물려받아 새 덱을 만들거나(restyle), 기존 덱 뒤에 슬라이드를 추가(extend).",
        ],
        [
            <MessageSquareText key="i" className="size-5 text-primary-600" />,
            "채팅으로 같이 만들기",
            "PPTX 를 올리면 전 슬라이드가 미리보기로 뜨고, 채팅으로 수정·추가·삭제를 요청하면 즉시 반영됩니다. 스튜디오에서 사용해 보세요.",
        ],
        [
            <ImageIcon key="i" className="size-5 text-primary-600" />,
            "이미지 자동 생성",
            "Strategist가 슬라이드별 시각 자산을 계획하고 OpenAI / Pexels 로 자동 확보. BYOK 키만 추가.",
        ],
        [
            <Mic key="i" className="size-5 text-primary-600" />,
            "한국어 내레이션",
            "Edge-TTS 의 한국어 음성 (SunHi · InJoon) 으로 발표자 노트를 MP3 로 합성해 PPTX 안에 자동 임베드.",
        ],
        [
            <Plug key="i" className="size-5 text-primary-600" />,
            "AI Agent 호환",
            "MCP 서버 노출. Claude Desktop / Cursor / 자체 Agent 에서 URL 한 줄로 연결.",
        ],
        [
            <ShieldCheck key="i" className="size-5 text-primary-600" />,
            "BYOK",
            "Anthropic / OpenAI API 키는 요청마다 가져오고 저장하지 않습니다. 비용도 사용자 부담.",
        ],
    ];
    return (
        <section className="mt-24 w-full max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-neutral-900">
                엔진 한 장 요약
            </h2>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map(([icon, title, body]) => (
                    <div
                        key={title}
                        className="rounded-xl border border-neutral-200 p-5 hover:border-primary-300 transition-colors"
                    >
                        <div className="mb-3">{icon}</div>
                        <h3 className="font-semibold text-neutral-900">{title}</h3>
                        <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
                            {body}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function HowItWorks() {
    const steps: Array<[string, string, string]> = [
        ["01", "발표 의도 입력", "한 문장이면 충분합니다. 참고 문서(PDF·DOCX·PPTX·…) 첨부는 선택."],
        ["02", "옵션 조정", "언어 · 스타일 · 페이지 수 · 이미지·내레이션 토글 · BYOK Anthropic 키."],
        ["03", "실시간 생성", "각 단계 (변환 → 전략 → 페이지 생성 → 품질 검사 → 빌드) 가 SSE 로 실시간 스트리밍."],
        ["04", "PPTX 다운로드", "한글 파일명 그대로. PowerPoint 에서 모든 요소를 클릭하여 편집 가능."],
    ];
    return (
        <section className="mt-24 w-full max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-neutral-900">
                4단계로 끝
            </h2>
            <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {steps.map(([num, title, body]) => (
                    <li key={num} className="rounded-xl border border-neutral-200 p-5">
                        <span className="text-3xl font-bold text-primary-200 font-mono">
                            {num}
                        </span>
                        <h3 className="mt-2 font-semibold text-neutral-900">{title}</h3>
                        <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
                            {body}
                        </p>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function McpCallout() {
    return (
        <section className="mt-24 w-full max-w-5xl">
            <div className="rounded-2xl bg-neutral-900 text-neutral-100 p-8 sm:p-12">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-primary-300 mb-2">
                            AI Agent 통합
                        </p>
                        <h2 className="text-2xl font-bold">
                            MCP URL 한 줄로 연결
                        </h2>
                        <p className="mt-3 text-neutral-300 leading-relaxed">
                            Claude Desktop · Cursor · 자체 Agent 가{" "}
                            <code className="font-mono text-sm bg-neutral-800 px-1.5 py-0.5 rounded">
                                /edit2docs-mcp
                            </code>{" "}
                            를 도구로 등록하면 즉시 PPT 생성·미리보기·다운로드가 가능합니다.
                        </p>
                        <Link
                            href="/docs/mcp"
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100 transition-colors"
                        >
                            <Code2 className="size-4" />
                            연결 방법 보기
                        </Link>
                    </div>
                    <pre className="text-xs font-mono bg-neutral-800 rounded-lg p-4 overflow-x-auto sm:w-72 leading-relaxed">
{`{
  "mcpServers": {
    "edit2docs": {
      "url": "/edit2docs-mcp",
      "headers": {
        "Authorization":
          "Bearer YOUR_KEY"
      }
    }
  }
}`}
                    </pre>
                </div>
            </div>
        </section>
    );
}
