import type { Metadata } from "next";

import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { LocaleProvider } from "@/lib/i18n";

import "./globals.css";

export const metadata: Metadata = {
    title: {
        default: "edit2docs — Editable PPT, Word & Excel from one line",
        template: "%s — edit2docs",
    },
    description:
        "An AI document engine that generates PPT, Word, and Excel from a single line of intent and lets you edit them over chat. " +
        "English-first · full Korean support — Pretendard typography, ko-KR OOXML, and industry/consulting tones built in. " +
        "Connects to external AI agents via MCP.",
    keywords: [
        "edit2docs",
        "AI presentation",
        "PowerPoint generation",
        "AI document engine",
        "MCP",
        "Korean PPT",
        "ppt-master",
    ],
    openGraph: {
        title: "edit2docs — Editable PPT, Word & Excel from one line",
        locale: "en_US",
        type: "website",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                {/*
                 * Pretendard via CDN. Renders Latin cleanly and is required for
                 * first-class Korean (strategist.en.md §K.1). Falls back to
                 * Apple SD Gothic Neo / Malgun Gothic / Noto Sans KR via the
                 * Tailwind sans stack when the CDN is unreachable.
                 */}
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
                    crossOrigin="anonymous"
                />
            </head>
            <body className="min-h-screen flex flex-col">
                <LocaleProvider>
                    <SiteHeader />
                    <div className="flex-1 flex flex-col">{children}</div>
                    <SiteFooter />
                </LocaleProvider>
            </body>
        </html>
    );
}
