/** Engine response shapes used across the UI. Kept in one place so route
 *  handlers / pages can type their `fetch().json()` results consistently.
 *
 *  Mirrors src/edit2docs/api/routes/jobs.py::JobResponse in the engine.
 */

export interface JobResponse {
    id: string;
    tenant_id: string;
    kind: string;
    status: "queued" | "running" | "done" | "failed" | "cancelled";
    params: Record<string, unknown>;
    cost: Record<string, number>;
    result: JobResult;
    error_message: string | null;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
}

export interface JobResult {
    pptx_asset_id?: string;
    doc_asset_id?: string;
    format?: string; // pptx | docx | xlsx
    page_count?: number;
    spec_lock?: string;
    design_spec?: string;
    detected_langs?: string[];
    quality_issues?: QualityIssue[];
}

export interface QualityIssue {
    page_index: number | null;
    severity: "error" | "warning" | "info";
    code: string;
    message: string;
    location: string | null;
}
