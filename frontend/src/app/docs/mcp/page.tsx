/**
 * MCP connection guide (placeholder).
 *
 * The real content lives in CocoRoF/edit2docs/docs/mcp-clients.md.
 * W5 will mirror or render that file inline. For now we link out.
 */
export const metadata = {
    title: "MCP 연결 가이드",
};

export default function McpDocsPage() {
    return (
        <main className="flex-1 flex flex-col items-center px-6 py-16 max-w-3xl mx-auto w-full prose prose-neutral">
            <h1>MCP 연결 가이드</h1>
            <p className="text-neutral-600">
                edit2docs 서버는 두 가지 MCP 트랜스포트를 노출합니다.
            </p>

            <ul>
                <li>
                    <strong>Streamable HTTP</strong> (MCP spec 2025-03-26+) —{" "}
                    <code>/edit2docs-mcp</code>
                </li>
                <li>
                    <strong>SSE (legacy)</strong> — <code>/edit2docs-mcp-sse</code>
                </li>
            </ul>

            <h2>Claude Desktop / Cursor 설정 예시</h2>
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
                상세 가이드:{" "}
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
