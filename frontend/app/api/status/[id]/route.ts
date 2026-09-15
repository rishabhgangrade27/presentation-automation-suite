import { NextRequest, NextResponse } from 'next/server';
import { getPresentonStatusDirect, isPresentonDirectModeEnabled } from '@/lib/presentonDirect';

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5678').replace(/\/$/, '');

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isPresentonDirectModeEnabled()) {
    try {
      const { status, data } = await getPresentonStatusDirect(id);
      return NextResponse.json(data, { status });
    } catch {
      return NextResponse.json(
        { status: 'error', error: 'Could not reach the Presenton backend directly.' },
        { status: 502 },
      );
    }
  }

  try {
    // Query param, not a path segment -- this n8n release's dynamic-webhook
    // matching only supports a dynamic prefix, not a `:param` elsewhere in
    // the path (see n8n/presenton-generation-workflow.json).
    const res = await fetch(`${N8N_BASE_URL}/webhook/presenton/status?id=${encodeURIComponent(id)}`, {
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
