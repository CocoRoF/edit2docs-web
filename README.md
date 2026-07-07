# edit2docs-web

**Web studio for the [edit2docs](https://github.com/CocoRoF/edit2docs) engine —
generate & chat-edit PPT · Word · Excel in the browser. English-first UI with
full Korean support (KO/EN toggle).**

| | |
|---|---|
| Stack | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS |
| basePath | `/edit2docs` (override with `NEXT_PUBLIC_BASE_PATH`) |
| Engine | `EDIT2DOCS_SERVER_INTERNAL_URL` (default `http://edit2docs-server:8000`) + `EDIT2DOCS_SERVER_API_KEY` bearer |
| Health probe | `GET ${basePath}/api/health` (reports the deployed engine commit) |
| i18n | dependency-free EN/KO dictionaries, header toggle, `Accept-Language` + job `lang` follow the active locale |

## What it does

**Generate** (`/generate`): upload PDF / DOCX / PPTX / XLSX sources (Unicode
filenames round-trip intact), paste your Anthropic key (BYOK — never
persisted), pick the output format and options (language, style, page count,
narration, image generation), and watch every pipeline stage stream in over
SSE. Result page ships the editable file plus design-spec / spec-lock /
quality-issue viewers and a cost summary.

**Co-edit** (`/studio`): open any PPTX / DOCX / XLSX and edit it by chatting.
The canvas shows the engine's *addressable* preview — per-slide SVG for decks,
`data-e2d-*`-tagged HTML for documents and spreadsheets — and while a turn
streams, **the exact paragraph / cell / slide each operation touches is
highlighted live**, then flashed once the refreshed preview lands. Undo steps
back through the revision chain; untouched content is byte-identical by
engine contract. Double-click inline text editing on slides.

**MCP guide** (`/docs/mcp`): connection instructions so AI agents
(Claude Desktop / Claude Code / Cursor) can drive the same engine directly.

## Local dev (against any engine)

```bash
cd frontend/src
npm install
NEXT_PUBLIC_BASE_PATH="" \
EDIT2DOCS_SERVER_INTERNAL_URL=http://localhost:8000 \
npm run dev
# → http://localhost:3000/
```

Run the engine locally first: `pip install "edit2docs[server]" && edit2docs serve`.

To mirror production's basePath: `NEXT_PUBLIC_BASE_PATH=/edit2docs npm run dev`
→ `http://localhost:3000/edit2docs`.

## Production reference

[hr_blog2.0](https://github.com/CocoRoF/hr_blog2.0)'s compose stack runs this
app next to the engine behind nginx (`/edit2docs` → this UI, `/edit2docs-api`
→ engine REST, `/edit2docs-mcp*` → engine MCP). Its `edit2docs-web/`
Dockerfile clones this repo at build time — see that repo for the full
service topology.

## Languages

The UI defaults to English and resolves the visitor's locale client-side
(saved preference → browser language), so Korean-browser visitors land on a
fully Korean UI automatically; a header toggle switches any time. The active
locale rides every engine call as `Accept-Language` and seeds the job `lang`,
so generated documents and the engine's live-edit labels match the UI
language. Korean is a complete translation, not a subset (241 keys per
locale, compile-time key-shape enforcement).

## Architecture

See [PLAN.md](./PLAN.md) for the original design — service topology, URL
surface, screens, Unicode-filename round-trip, and BYOK handling.

## License

[MIT](./LICENSE).

## Acknowledgments

Engine: [edit2docs](https://github.com/CocoRoF/edit2docs) (Apache-2.0; its
PPTX core is derived from [ppt-master](https://github.com/hugohe3/ppt-master),
MIT — synced through v3.1). Pattern:
[Edit2me](https://github.com/CocoRoF/Edit2me).
