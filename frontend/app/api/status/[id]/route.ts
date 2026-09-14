import { NextRequest, NextResponse } from 'next/server';

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5679').replace(/\/$/, '');

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/presenton/status/${encodeURIComponent(id)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        error: `Could not reach the automation workflow at ${N8N_BASE_URL}.`,
      },
      { status: 502 },
    );
  }
}
