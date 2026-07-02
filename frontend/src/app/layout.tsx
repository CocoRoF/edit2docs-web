import type { Metadata } from "next";

import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

import "./globals.css";

export const metadata: Metadata = {
    title: {
        default: "edit2docs — 한 줄이면 편집 가능한 PPT·Word·Excel",
        template: "%s — edit2docs",
    },
    description:
        "의도 한 줄로 PPT·Word·Excel을 생성하고 채팅으로 편집하는 AI 문서 엔진. " +
        "Pretendard 폰트, ko-KR OOXML, 한국 산업/컨설팅 톤이 기본 탑재. " +
        "MCP로 외부 AI Agent와도 연결됩니다.",
    keywords: [
        "edit2docs",
        "한국어 PPT",
        "AI 프레젠테이션",
        "ppt-master",
        "MCP",
        "Korean PowerPoint generation",
    ],
    openGraph: {
        title: "edit2docs — 한 줄이면 편집 가능한 PPT·Word·Excel",
        locale: "ko_KR",
        type: "website",
    },
    other: {
        // RFC 5646 lang tag for the document; pairs with <html lang> below.
        "Accept-Language": "ko-KR",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko-KR">
            <head>
                {/*
                 * Pretendard via CDN. Korean-first body face per strategist.en.md §K.1.
                 * Falls back to Apple SD Gothic Neo / Malgun Gothic / Noto Sans KR via
                 * the Tailwind sans stack when the CDN is unreachable.
                 */}
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
                    crossOrigin="anonymous"
                />
            </head>
            <body className="min-h-screen flex flex-col">
                <SiteHeader />
                <div className="flex-1 flex flex-col">{children}</div>
                <SiteFooter />
            </body>
        </html>
    );
}
