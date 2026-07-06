import McpGuide from "./McpGuide";

/**
 * MCP connection guide (placeholder).
 *
 * The real content lives in CocoRoF/edit2docs/docs/mcp-clients.md.
 * W5 will mirror or render that file inline. For now we link out.
 * Metadata stays English (server component); the body is a client
 * component so it can follow the active locale.
 */
export const metadata = {
    title: "MCP Integration Guide",
};

export default function McpDocsPage() {
    return <McpGuide />;
}
