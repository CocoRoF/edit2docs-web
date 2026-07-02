"use client";

import { Github, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
    { href: "/", label: "홈" },
    { href: "/generate", label: "지금 만들기" },
    { href: "/studio", label: "같이 만들기" },
    { href: "/docs/mcp", label: "MCP 가이드" },
];

export default function SiteHeader() {
    const pathname = usePathname();
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
                    {NAV.map((item) => {
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
