import {
  GENERATE_WEBHOOK_PATH,
  MAX_WAIT_MS,
  N8N_BASE_URL,
  POLL_INTERVAL_MS,
  STATUS_WEBHOOK_PATH_PREFIX,
} from './config.js';

export interface GenerateInput {
  content: string;
  instructions?: string;
  n_slides?: number;
  language?: string;
  tone?: 'default' | 'casual' | 'professional' | 'funny' | 'educational' | 'sales_pitch';
  verbosity?: 'concise' | 'standard' | 'text-heavy';
  template?: string;
  export_as?: 'pptx' | 'pdf';
  include_title_slide?: boolean;
  include_table_of_contents?: boolean;
  web_search?: boolean;
}

export interface StartJobResult {
  task_id: string;
  status: string;
  message?: string;
  created_slides?: number;
  remaining_slides?: number;
  presentation_id?: string;
  check_status_path?: string;
}

export interface JobStatusResult {
  task_id: string;
  status: 'pending' | 'completed' | 'error' | string;
  message?: string;
  created_slides?: number | null;
  remaining_slides?: number | null;
  presentation_id?: string | null;
  download_url?: string | null;
  edit_url?: string | null;
  error?: unknown;
}

class PresentonWorkflowError extends Error {}

async function readJsonOrThrow(res: Response, context: string): Promise<any> {
  const text = await res.text();
  let body: any = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // non-JSON body, fall through to raw text below
  }
  if (!res.ok) {
    const detail = body?.error ?? body?.message ?? text ?? `HTTP ${res.status}`;
    throw new PresentonWorkflowError(`${context} failed: ${detail}`);
  }
  return body ?? {};
}

/** Starts a presentation generation job via the n8n "start" webhook. */
export async function startGenerationJob(input: GenerateInput): Promise<StartJobResult> {
  const res = await fetch(`${N8N_BASE_URL}${GENERATE_WEBHOOK_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readJsonOrThrow(res, 'Starting presentation generation');
}

/** Reads current job status via the n8n "status" webhook. */
export async function getJobStatus(taskId: string): Promise<JobStatusResult> {
  const res = await fetch(`${N8N_BASE_URL}${STATUS_WEBHOOK_PATH_PREFIX}/${encodeURIComponent(taskId)}`, {
    method: 'GET',
  });
  return readJsonOrThrow(res, 'Checking presentation generation status');
}

/**
 * Starts a job and polls it to completion (or failure / timeout).
 * Mirrors the same start+poll contract the frontend uses against n8n --
 * there is exactly one generation pipeline, this just drives it synchronously.
 */
export async function generateAndWait(
  input: GenerateInput,
  onProgress?: (status: JobStatusResult) => void,
): Promise<JobStatusResult> {
  const started = await startGenerationJob(input);
  const deadline = Date.now() + MAX_WAIT_MS;

  let last: JobStatusResult = {
    task_id: started.task_id,
    status: started.status,
    message: started.message,
    created_slides: started.created_slides,
    remaining_slides: started.remaining_slides,
    presentation_id: started.presentation_id,
  };

  while (Date.now() < deadline) {
    if (last.status === 'completed' || last.status === 'error') {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    last = await getJobStatus(started.task_id);
    onProgress?.(last);
  }

  throw new PresentonWorkflowError(
    `Timed out after ${Math.round(MAX_WAIT_MS / 1000)}s waiting for task ${started.task_id}. ` +
      `It may still finish -- call check_presentation_status with this task_id to find out.`,
  );
}
