"use client";

import { useEffect, useRef, useState } from "react";

import { withBase } from "@/lib/basePath";

/** One JobEvent envelope from the engine's `/v1/jobs/{id}/events` stream. */
export interface JobEvent {
    job_id: string;
    type: "stage" | "progress" | "page_done" | "log" | "error";
    payload: {
        stage?: string;
        progress?: number;
        message_key?: string;
        message_vars?: Record<string, unknown>;
        page_index?: number;
        [key: string]: unknown;
    };
    created_at: string;
}

interface UseJobEventsOptions {
    /** When null the hook stays idle (no connection). */
    jobId: string | null;
    /** Stops streaming once the job reaches a terminal state. */
    onTerminal?: (lastEvent: JobEvent) => void;
}

interface UseJobEventsResult {
    events: JobEvent[];
    connected: boolean;
    error: string | null;
}

/**
 * Subscribe to the engine's SSE stream for a job.
 *
 * Browser's native EventSource doesn't support custom headers, but we
 * don't need them here — the proxy attaches the engine bearer token
 * server-side. Reconnects on transient errors with a 2s backoff.
 */
export function useJobEvents({
    jobId,
    onTerminal,
}: UseJobEventsOptions): UseJobEventsResult {
    const [events, setEvents] = useState<JobEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!jobId) return;

        // Reset state on a fresh job_id.
        setEvents([]);
        setError(null);
        setConnected(false);

        const url = withBase(`/api/jobs/${jobId}/events`);
        const source = new EventSource(url);
        sourceRef.current = source;

        const stages = new Set([
            "stage",
            "progress",
            "page_done",
            "log",
            "error",
        ]);

        source.onopen = () => {
            setConnected(true);
            setError(null);
        };

        // FastMCP's sse-starlette sends one event per "event:" line; we
        // listen to each named event. The engine emits `event: stage`,
        // `event: progress`, etc.
        for (const name of stages) {
            source.addEventListener(name, (ev) => {
                try {
                    const data = JSON.parse((ev as MessageEvent).data) as JobEvent;
                    setEvents((prev) => [...prev, data]);
                    const stage = data.payload.stage;
                    if (stage === "done" || stage === "failed") {
                        onTerminal?.(data);
                        source.close();
                        sourceRef.current = null;
                        setConnected(false);
                    }
                } catch (err) {
                    console.error("[useJobEvents] bad event payload", err, ev);
                }
            });
        }

        source.onerror = () => {
            // EventSource auto-reconnects for transient errors; we only
            // surface a banner so the UI can show a "connecting…" state.
            setConnected(false);
            setError("스트림 연결이 끊겼습니다. 재연결 중…");
        };

        return () => {
            source.close();
            sourceRef.current = null;
        };
    }, [jobId, onTerminal]);

    return { events, connected, error };
}
