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
 * The single live-progress element while a turn runs — there is no separate
 * "busy" bubble; this is it. It shows the engine's *per-operation* tool
 * activity (one line per slide/paragraph/cell the editor touches, using the
 * already-localized `op.label`) as a smooth rolling ticker: a new line slides
 * up from the bottom, the ones above ease fainter and dissolve under the top
 * gradient mask. When a slide is regenerated after a render error, the retry
 * shows explicitly.
 *
 * Before any per-op events arrive (planning) or after they finish (applying),
 * there are no op lines, so it falls back to a single line carrying the current
 * coarse stage — never both at once, so nothing is duplicated.
 */
export default function ActivityLog({
    events,
    active,
    stageLabel,
}: {
    events: JobEvent[];
    active: boolean;
    stageLabel?: string;
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

    if (!active) return null;

    // Op feed when the editor is touching slides; otherwise a single line for
    // the current coarse stage (planning / applying). Exactly one of the two —
    // so the running state and the history are never shown side by side.
    const visible: LogLine[] =
        lines.length > 0
            ? lines.slice(-WINDOW)
            : stageLabel
              ? [{ id: "stage", text: stageLabel, state: "run" }]
              : [];
    if (visible.length === 0) return null;

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
