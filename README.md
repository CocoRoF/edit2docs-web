# edit2docs-web

Korean-first web UI for the [edit2docs](https://github.com/CocoRoF/edit2docs) engine.
Served at `${basePath}` by [hr_blog2.0](https://github.com/CocoRoF/hr_blog2.0)
(default `/edit2docs`). Mirrors the architecture of
[Edit2me](https://github.com/CocoRoF/Edit2me) so the blog's compose can
bring it up the same way.

| | |
|---|---|
| Stack | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS |
| basePath | `/edit2docs` (override with `NEXT_PUBLIC_BASE_PATH`) |
| Health probe | `GET ${basePath}/api/health` |
| Engine | calls `http://edit2docs-server:8000` over docker network |

## What it does

1. Upload a Korean PDF / DOCX / PPTX / XLSX.
2. Paste your Anthropic key (BYOK — never persisted).
3. Pick deck options (lang, style, page count, narration, image gen).
4. Watch each pipeline stage stream in (SSE).
5. Preview pages as they're produced.
6. Download the editable PPTX with the original Korean filename preserved.

Plus an MCP connection guide so AI Agents (Claude Desktop / Cursor) can
hit the same engine.

## Status

All 5 user-facing milestones (W0–W5) are merged. The hr_blog2.0
integration PR is at https://github.com/CocoRoF/hr_blog2.0/pull/22.

| Milestone | What ships |
|---|---|
| W0 | Next.js 15 scaffold, basePath, Korean typography, /api/health |
| W1 | hr_blog2.0 compose + nginx routes (`/edit2docs`, `/edit2docs-api`, `/edit2docs-mcp`, `/edit2docs-mcp-sse`), redis, edit2docs-server |
| W2 | Upload screen — drag-and-drop, Korean filename roundtrip end-to-end |
| W3 | Generate form (BYOK Anthropic key + options) + SSE live progress (Korean stage labels) |
| W4 | Job result view — PPTX download (Korean filename preserved), design_spec + spec_lock viewers, quality issues, cost summary |
| W5 | Site header / footer with live engine commit, polished home page with feature grid + 4-step flow + MCP callout |

## Local dev (without hr_blog2.0)

```bash
cd frontend/src
npm install
NEXT_PUBLIC_BASE_PATH="" npm run dev
# → http://localhost:3000/
```

To run with the same basePath used in production:

```bash
NEXT_PUBLIC_BASE_PATH=/edit2docs npm run dev
# → http://localhost:3000/edit2docs
```

## Architecture

See [PLAN.md](./PLAN.md) for the full design — service topology, URL
surface, screens, Korean-filename round-trip, BYOK handling, and the
W0–W5 PR plan.

## License

[MIT](./LICENSE).

## Acknowledgments

Engine: [edit2docs](https://github.com/CocoRoF/edit2docs) (built on
[ppt-master](https://github.com/hugohe3/ppt-master), MIT).
Pattern: [Edit2me](https://github.com/CocoRoF/Edit2me).
