import { NextRequest, NextResponse } from 'next/server';

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5679').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: 'error', error: 'Invalid JSON body' }, { status: 400 });
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
