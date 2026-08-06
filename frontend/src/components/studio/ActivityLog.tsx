"use client";

import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { useMemo } from "react";

import type { JobEvent } from "@/hooks/useJobEvents";
import { useT } from "@/lib/i18n";

/** Max lines kept on screen — older ones roll off the top under the mask. */
const WINDOW = 4;

interface LogLine {
    id: string;
    text: string;
    state: "run" | "retry" | "ok" | "fail";
}

/** The per-operation payload the engine streams in message_vars.op. `label`
 *  is already localized to the turn's language (see tools/_edit_events.py). */
interface OpVar {
    label?: string;
    phase?: "start" | "done";
    status?: string;
}

/**
 * A live, ephemeral feed of the engine's *per-operation* tool activity while a
 * turn runs — one line per slide/paragraph/cell the editor touches, using the
 * engine's already-localized `op.label`. A new line slides up from the bottom;
 * the ones above ease to a fainter opacity and dissolve under the container's
 * top gradient mask, so the log reads as a smooth rolling ticker.
 *
 * It deliberately shows ONLY op-level events, not the coarse stage labels —
 * the busy bubble above already carries the current stage, so surfacing stages
 * here too would just duplicate it. When a slide is regenerated after a render
 * error, the retry is shown explicitly so the self-correction is visible.
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
            if (!op?.label) return; // op-level events only — no coarse stages
            let state: LogLine["state"];
            let text = op.label;
            if (op.phase === "done") {
                state = op.status === "failed" ? "fail" : "ok";
            } else if (op.status === "retry") {
                state = "retry";
                text = `${op.label} · ${t.studio.retry}`;
            } else {
                state = "run";
            }
            out.push({ id: `op-${i}`, text, state });
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
                        {line.state === "retry" && (
                            <RotateCcw className="size-3.5 shrink-0 animate-spin text-amber-500" />
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
