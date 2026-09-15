/**
 * Direct-to-Presenton adapter for local validation while n8n is intentionally
 * offline. Reshapes Presenton's raw REST responses into the exact same
 * {task_id, status, message, download_url, edit_url, ...} shape the n8n
 * workflow produces (see n8n/presenton-generation-workflow.json), so page.tsx
 * needs zero changes when this route switches back to going through n8n --
 * only PRESENTON_BASE_URL vs N8N_BASE_URL selection changes.
 */
import type { GenerateRequestBody, StartJobResponse, StatusResponse } from './types';

export const PRESENTON_BASE_URL = (process.env.PRESENTON_BASE_URL || '').replace(/\/$/, '');

export function isPresentonDirectModeEnabled(): boolean {
  return Boolean(PRESENTON_BASE_URL);
}

/** Presenton (native run) returns exported files as raw OS paths under
 * APP_DATA_DIRECTORY, e.g. "C:\...\app_data_native\exports\pptx\deck.pptx".
 * FastAPI serves that same tree at /app_data/*, so rebuild a fetchable URL by
 * keeping only the path from "exports" onward. */
function toDownloadUrl(rawPath: string | null | undefined): string | null {
  if (!rawPath) return null;
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;
  const normalized = rawPath.replace(/\\/g, '/');
  const idx = normalized.toLowerCase().indexOf('/exports/');
  const relative = idx >= 0 ? normalized.slice(idx + 1) : normalized.replace(/^\/+/, '');
  return `${PRESENTON_BASE_URL}/app_data/${relative}`;
}

export async function startPresentonJobDirect(body: GenerateRequestBody): Promise<{ status: number; data: StartJobResponse }> {
  const payload = {
    content: body.content,
    instructions: body.instructions,
    n_slides: body.n_slides,
    language: body.language,
    tone: body.tone,
    verbosity: body.verbosity,
    template: 'general',
    export_as: body.export_as,
    include_title_slide: body.include_title_slide,
    include_table_of_contents: body.include_table_of_contents,
  };

  const res = await fetch(`${PRESENTON_BASE_URL}/api/v1/ppt/presentation/generate/async`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      status: res.status,
      data: { status: 'error', error: raw?.detail ? String(raw.detail) : `Presenton returned HTTP ${res.status}` },
    };
  }

  return {
    status: res.status,
    data: { task_id: raw.id, status: raw.status, message: raw.message },
  };
}

export async function getPresentonStatusDirect(taskId: string): Promise<{ status: number; data: StatusResponse }> {
  const res = await fetch(`${PRESENTON_BASE_URL}/api/v1/async-tasks/status/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      status: res.status,
      data: { status: 'error', error: raw?.detail ? String(raw.detail) : `Presenton returned HTTP ${res.status}` },
    };
  }

  const data = raw.data || {};
  return {
    status: 200,
    data: {
      task_id: raw.id,
      status: raw.status,
      message: raw.message,
      created_slides: data.created_slides ?? null,
      remaining_slides: data.remaining_slides ?? null,
      download_url: toDownloadUrl(data.path),
      edit_url: data.edit_path ?? null,
      error: raw.error?.detail ? String(raw.error.detail) : raw.error ? JSON.stringify(raw.error) : undefined,
    },
  };
}
