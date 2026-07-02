"use client";

import { AlertTriangle, Info, AlertCircle } from "lucide-react";

import type { QualityIssue } from "@/lib/api";

const SEVERITY_LABEL: Record<string, string> = {
    error: "오류",
    warning: "경고",
    info: "정보",
};

interface QualityIssueListProps {
    issues: QualityIssue[];
}

export default function QualityIssueList({ issues }: QualityIssueListProps) {
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    const infos = issues.filter((i) => i.severity === "info");
    return (
        <div className="rounded-xl border border-neutral-200 px-5 py-4">
            <h2 className="font-semibold text-neutral-900">
                품질 검사 결과
                <span className="ml-2 text-xs font-normal text-neutral-500">
                    오류 {errors.length} · 경고 {warnings.length} · 정보 {infos.length}
                </span>
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
                {issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                        <SeverityIcon severity={issue.severity} />
                        <div className="flex-1 min-w-0">
                            <p className="text-neutral-800">
                                {issue.message}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                                {SEVERITY_LABEL[issue.severity] ?? issue.severity} ·
                                {issue.page_index !== null && (
                                    <> {issue.page_index + 1}p ·</>
                                )}{" "}
                                {issue.code}
                                {issue.location && <> · {issue.location}</>}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SeverityIcon({ severity }: { severity: string }) {
    switch (severity) {
        case "error":
            return <AlertCircle className="size-4 text-red-600 mt-0.5" />;
        case "warning":
            return <AlertTriangle className="size-4 text-amber-600 mt-0.5" />;
        default:
            return <Info className="size-4 text-blue-600 mt-0.5" />;
    }
}
