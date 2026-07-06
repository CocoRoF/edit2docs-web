"use client";

import { useT } from "@/lib/i18n";

/** Locale-aware body of the MCP connection guide. */
export default function McpGuide() {
    const t = useT();
    return (
        <main className="flex-1 flex flex-col items-center px-6 py-16 max-w-3xl mx-auto w-full prose prose-neutral">
            <h1>{t.mcpDocs.title}</h1>
            <p className="text-neutral-600">{t.mcpDocs.intro}</p>

            <ul>
                <li>
                    <strong>Streamable HTTP</strong> (MCP spec 2025-03-26+) —{" "}
                    <code>/edit2docs-mcp</code>
                </li>
                <li>
                    <strong>SSE (legacy)</strong> — <code>/edit2docs-mcp-sse</code>
                </li>
            </ul>

            <h2>{t.mcpDocs.configHeading}</h2>
            <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "mcpServers": {
    "edit2docs": {
      "url": "https://hrletsgo.me/edit2docs-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
            </pre>

            <p className="mt-6 text-sm text-neutral-500">
                {t.mcpDocs.fullGuide}{" "}
                <a
                    href="https://github.com/CocoRoF/edit2docs/blob/main/docs/mcp-clients.md"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                >
                    edit2docs/docs/mcp-clients.md
                </a>
            </p>
        </main>
    );
}
