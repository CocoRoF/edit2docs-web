"use client";

import { useT } from "@/lib/i18n";

/**
 * Localized "engine info unavailable" note for the footer. Split out as a
 * tiny client component so SiteFooter can stay a server component (it
 * fetches engine health at render time).
 */
export default function EngineStatusNote({ reason }: { reason: string }) {
    const t = useT();
    return <p className="text-neutral-400">{t.footer.engineUnavailable(reason)}</p>;
}
