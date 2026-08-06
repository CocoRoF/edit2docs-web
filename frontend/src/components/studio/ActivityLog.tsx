"use client";

import { Check, Loader2, X } from "lucide-react";
import { useMemo } from "react";

import type { JobEvent } from "@/hooks/useJobEvents";
import { useT } from "@/lib/i18n";

/** Max lines kept on screen — older ones roll off the top under the mask. */
const WINDOW = 4;

interface LogLine {
    id: string;
    text: string;
    state: "run" | "ok" | "fail";
}

/** The per-operation payload the engine streams in message_vars.op. `label`
 *  is already localized to the turn's language (see tools/_edit_events.py). */
interface OpVar {
    label?: string;
    phase?: "start" | "done";
    status?: string;
}

/**
 * A live, ephemeral feed of the engine's tool activity while a turn runs.
 *
 * Each SSE event becomes one line: granular per-slide/paragraph/cell ops use
 * the engine's already-localized `op.label`; coarser stages fall back to the
 * `t.stages` dictionary. A new line slides up from the bottom; the ones above
 * ease to a fainter opacity and dissolve under the container's top gradient
 * mask, so the log reads as a smooth rolling ticker rather than a growing wall
 * of text. Every tool step is surfaced exactly once, in order.
 */
export default function ActivityLog({
    events,
    active,
}: {
    events: JobEvent[];
    active: boolean;
}) {
    const t = useT();

    const lines = useMemo<LogLine[]>(() => {
        const out: LogLine[] = [];
        events.forEach((e, i) => {
            const op = e.payload.message_vars?.op as OpVar | undefined;
            if (op?.label) {
                const state: LogLine["state"] =
                    op.phase === "done"
                        ? op.status === "failed"
                            ? "fail"
                            : "ok"
                        : "run";
                out.push({ id: `op-${i}`, text: op.label, state });
                return;
            }
            // Coarse stage events (no per-op detail). Skip the terminal
            // done/failed markers — those are conveyed by the turn result.
            const stage = e.payload.stage;
            if (typeof stage === "string" && stage !== "done" && stage !== "failed") {
                const label = (t.stages as Record<string, string>)[stage];
                if (label) out.push({ id: `st-${i}`, text: label, state: "run" });
            }
        });
        return out;
    }, [events, t]);

    // Only the most recent WINDOW lines are mounted; the rest have rolled off.
    const visible = lines.slice(-WINDOW);
    if (!active || visible.length === 0) return null;

    return (
        <div className="e2d-activitylog" aria-live="polite">
            {visible.map((line, idx) => {
                // depth 0 = newest (bottom, fully opaque); older rows fade.
                const depth = visible.length - 1 - idx;
                const opacity = depth === 0 ? 1 : Math.max(0.28, 1 - depth * 0.26);
                return (
                    <div key={line.id} className="e2d-activityrow" style={{ opacity }}>
                        {line.state === "run" && (
                            <Loader2 className="size-3.5 shrink-0 animate-spin text-primary-600" />
                        )}
                        {line.state === "ok" && (
                            <Check className="size-3.5 shrink-0 text-emerald-600" />
                        )}
                        {line.state === "fail" && (
                            <X className="size-3.5 shrink-0 text-red-500" />
                        )}
                        <span className="truncate">{line.text}</span>
                    </div>
                );
            })}
        </div>
    );
}
