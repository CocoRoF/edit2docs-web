"use client";

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

import { useT } from "@/lib/i18n";

/**
 * edit2docs-web home / demo entry point.
 *
 * Three-section layout:
 *  1. Hero with primary CTAs
 *  2. Feature grid (eight tiles — what the engine actually does)
 *  3. How-it-works flow (4 numbered steps)
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
    const t = useT();
    return (
        <section className="text-center max-w-3xl mt-16 sm:mt-24">
            <p className="text-sm font-medium text-primary-600 mb-3">
                {t.home.kicker}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900">
                {t.home.heroTitle1}
                <br />
                {t.home.heroTitle2}
            </h1>
            <p className="mt-6 text-lg text-neutral-600 leading-relaxed">
                {t.home.heroBody1} <br />
                {t.home.heroBody2}
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Link
                    href="/generate"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-white font-medium shadow-sm hover:bg-primary-700 transition-colors"
                >
                    <Zap className="size-4" />
                    {t.home.ctaGenerate}
                </Link>
                <a
                    href="/edit2docs-api/docs"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-5 py-3 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                    <FileText className="size-4" />
                    {t.home.ctaApi}
                </a>
                <Link
                    href="/docs/mcp"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-5 py-3 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                    <Plug className="size-4" />
                    {t.home.ctaMcp}
                </Link>
            </div>
        </section>
    );
}

const FEATURE_ICONS = [
    Languages,
    FileText,
    LayoutTemplate,
    MessageSquareText,
    ImageIcon,
    Mic,
    Plug,
    ShieldCheck,
];

function Features() {
    const t = useT();
    return (
        <section className="mt-24 w-full max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-neutral-900">
                {t.home.featuresTitle}
            </h2>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {t.home.features.map(({ title, body }, i) => {
                    const Icon = FEATURE_ICONS[i] ?? FileText;
                    return (
                        <div
                            key={title}
                            className="rounded-xl border border-neutral-200 p-5 hover:border-primary-300 transition-colors"
                        >
                            <div className="mb-3">
                                <Icon className="size-5 text-primary-600" />
                            </div>
                            <h3 className="font-semibold text-neutral-900">{title}</h3>
                            <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
                                {body}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function HowItWorks() {
    const t = useT();
    return (
        <section className="mt-24 w-full max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-neutral-900">
                {t.home.howTitle}
            </h2>
            <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {t.home.steps.map(({ title, body }, i) => (
                    <li key={title} className="rounded-xl border border-neutral-200 p-5">
                        <span className="text-3xl font-bold text-primary-200 font-mono">
                            {String(i + 1).padStart(2, "0")}
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
    const t = useT();
    return (
        <section className="mt-24 w-full max-w-5xl">
            <div className="rounded-2xl bg-neutral-900 text-neutral-100 p-8 sm:p-12">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-primary-300 mb-2">
                            {t.home.mcpKicker}
                        </p>
                        <h2 className="text-2xl font-bold">{t.home.mcpTitle}</h2>
                        <p className="mt-3 text-neutral-300 leading-relaxed">
                            {t.home.mcpBodyPrefix}{" "}
                            <code className="font-mono text-sm bg-neutral-800 px-1.5 py-0.5 rounded">
                                /edit2docs-mcp
                            </code>{" "}
                            {t.home.mcpBodySuffix}
                        </p>
                        <Link
                            href="/docs/mcp"
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100 transition-colors"
                        >
                            <Code2 className="size-4" />
                            {t.home.mcpCta}
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
