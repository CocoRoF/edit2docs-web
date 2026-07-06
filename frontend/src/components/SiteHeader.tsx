"use client";

import { Github, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLocale, useT, type Locale } from "@/lib/i18n";

export default function SiteHeader() {
    const pathname = usePathname();
    const t = useT();

    const nav = [
        { href: "/", label: t.nav.home },
        { href: "/generate", label: t.nav.generate },
        { href: "/studio", label: t.nav.studio },
        { href: "/docs/mcp", label: t.nav.mcp },
    ];

    return (
        <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-6">
                <Link
                    href="/"
                    className="flex items-center gap-2 font-bold text-neutral-900"
                >
                    <Sparkles className="size-4 text-primary-600" />
                    edit2docs
                </Link>
                <nav className="flex-1 flex items-center gap-1 text-sm">
                    {nav.map((item) => {
                        const active =
                            pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={
                                    "rounded-md px-3 py-1.5 transition-colors " +
                                    (active
                                        ? "bg-neutral-100 font-medium text-neutral-900"
                                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50")
                                }
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <LocaleToggle />
                <a
                    href="https://github.com/CocoRoF/edit2docs-web"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub"
                    className="text-neutral-500 hover:text-neutral-900"
                >
                    <Github className="size-4" />
                </a>
            </div>
        </header>
    );
}

/** Compact EN / 한국어 switcher. The Korean label is intentionally native. */
function LocaleToggle() {
    const { locale, setLocale } = useLocale();
    const t = useT();

    const option = (value: Locale, label: string) => (
        <button
            type="button"
            onClick={() => setLocale(value)}
            aria-pressed={locale === value}
            className={
                "rounded px-2 py-0.5 transition-colors " +
                (locale === value
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-900")
            }
        >
            {label}
        </button>
    );

    return (
        <div
            role="group"
            aria-label={t.header.languageSwitcher}
            className="flex items-center gap-0.5 rounded-md border border-neutral-200 p-0.5 text-xs font-medium"
        >
            {option("en", "EN")}
            {option("ko", "한국어")}
        </div>
    );
}
