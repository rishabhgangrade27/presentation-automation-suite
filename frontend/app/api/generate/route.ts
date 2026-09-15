import { NextRequest, NextResponse } from 'next/server';
import { isPresentonDirectModeEnabled, startPresentonJobDirect } from '@/lib/presentonDirect';
import type { GenerateRequestBody } from '@/lib/types';

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5678').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  let body: GenerateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: 'error', error: 'Invalid JSON body' }, { status: 400 });
  }

  // PRESENTON_BASE_URL set -> talk to Presenton directly (used while n8n is
  // intentionally offline for validation). Otherwise go through the n8n
  // workflow, the normal production path.
  if (isPresentonDirectModeEnabled()) {
    try {
      const { status, data } = await startPresentonJobDirect(body);
      return NextResponse.json(data, { status });
    } catch {
      return NextResponse.json(
        { status: 'error', error: 'Could not reach the Presenton backend directly.' },
        { status: 502 },
      );
    }
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/presenton/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        error: `Could not reach the automation workflow at ${N8N_BASE_URL}. Is n8n running and is the workflow active?`,
      },
      { status: 502 },
    );
  }
}
