'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExportFormat, GenerateRequestBody, StartJobResponse, StatusResponse, Tone, Verbosity } from '@/lib/types';

const TONES: { value: Tone; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'educational', label: 'Educational' },
  { value: 'sales_pitch', label: 'Sales pitch' },
  { value: 'funny', label: 'Funny' },
];

const VERBOSITY: { value: Verbosity; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'standard', label: 'Standard' },
  { value: 'text-heavy', label: 'Text-heavy' },
];

type Phase = 'idle' | 'starting' | 'pending' | 'completed' | 'error';

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 90; // ~6 minutes

export default function Home() {
  const [content, setContent] = useState('');
  const [instructions, setInstructions] = useState('');
  const [nSlides, setNSlides] = useState(8);
  const [language, setLanguage] = useState('');
  const [tone, setTone] = useState<Tone>('default');
  const [verbosity, setVerbosity] = useState<Verbosity>('standard');
  const [exportAs, setExportAs] = useState<ExportFormat>('pptx');
  const [includeTitleSlide, setIncludeTitleSlide] = useState(true);
  const [includeToc, setIncludeToc] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState<{ created: number | null; remaining: number | null }>({
    created: null,
    remaining: null,
  });
  const [result, setResult] = useState<StatusResponse | null>(null);
  const [errorText, setErrorText] = useState('');

  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  function stopPolling() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function pollStatus(taskId: string) {
    pollCount.current += 1;
    if (pollCount.current > MAX_POLLS) {
      setPhase('error');
      setErrorText('Timed out waiting for the presentation. It may still finish -- check n8n executions.');
      return;
    }

    try {
      const res = await fetch(`/api/status/${encodeURIComponent(taskId)}`, { cache: 'no-store' });
      const data: StatusResponse = await res.json();

      if (!res.ok || data.status === 'error') {
        setPhase('error');
        setErrorText(data.error || data.message || 'Generation failed.');
        return;
      }

      setStatusMessage(data.message || '');
      setProgress({ created: data.created_slides ?? null, remaining: data.remaining_slides ?? null });

      if (data.status === 'completed') {
        setResult(data);
        setPhase('completed');
        return;
      }

      setPhase('pending');
      pollTimer.current = setTimeout(() => pollStatus(taskId), POLL_INTERVAL_MS);
    } catch {
      setPhase('error');
      setErrorText('Lost connection while checking generation status.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    stopPolling();
    pollCount.current = 0;
    setResult(null);
    setErrorText('');
    setStatusMessage('');
    setProgress({ created: null, remaining: null });
    setPhase('starting');

    const body: GenerateRequestBody = {
      content: content.trim(),
      instructions: instructions.trim() || undefined,
      n_slides: nSlides,
      language: language.trim() || undefined,
      tone,
      verbosity,
      export_as: exportAs,
      include_title_slide: includeTitleSlide,
      include_table_of_contents: includeToc,
    };

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: StartJobResponse = await res.json();

      if (!res.ok || data.status === 'error' || !data.task_id) {
        setPhase('error');
        setErrorText(data.error || data.message || 'Could not start generation.');
        return;
      }

      setPhase('pending');
      setStatusMessage(data.message || 'Queued for generation');
      pollStatus(data.task_id);
    } catch {
      setPhase('error');
      setErrorText('Could not reach the server. Please try again.');
    }
  }

  const isBusy = phase === 'starting' || phase === 'pending';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">Presenton Automation Suite</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Generate a presentation</h1>
          <p className="mt-2 text-sm text-slate-600">
            Describe what the deck should cover. This form calls an n8n workflow that drives a self-hosted
            Presenton instance end-to-end and hands you back a downloadable file.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-700">
              Content / instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. The impact of AI agents on modern business operations -- cover automation ROI, common failure modes, and a 90-day adoption roadmap."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isBusy}
            />
          </div>

          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-slate-700">
              Extra instructions <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="instructions"
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Aimed at non-technical executives, keep it persuasive"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isBusy}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="n_slides" className="block text-sm font-medium text-slate-700">
                Slides
              </label>
              <input
                id="n_slides"
                type="number"
                min={1}
                max={50}
                value={nSlides}
                onChange={(e) => setNSlides(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isBusy}
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-slate-700">
                Language
              </label>
              <input
                id="language"
                type="text"
                placeholder="Auto"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isBusy}
              />
            </div>

            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-slate-700">
                Tone
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isBusy}
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="verbosity" className="block text-sm font-medium text-slate-700">
                Verbosity
              </label>
              <select
                id="verbosity"
                value={verbosity}
                onChange={(e) => setVerbosity(e.target.value as Verbosity)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isBusy}
              >
                {VERBOSITY.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <fieldset className="flex items-center gap-3">
              <legend className="sr-only">Export format</legend>
              {(['pptx', 'pdf'] as ExportFormat[]).map((fmt) => (
                <label key={fmt} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="export_as"
                    value={fmt}
                    checked={exportAs === fmt}
                    onChange={() => setExportAs(fmt)}
                    disabled={isBusy}
                  />
                  {fmt.toUpperCase()}
                </label>
              ))}
            </fieldset>

            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeTitleSlide}
                onChange={(e) => setIncludeTitleSlide(e.target.checked)}
                disabled={isBusy}
              />
              Title slide
            </label>

            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeToc}
                onChange={(e) => setIncludeToc(e.target.checked)}
                disabled={isBusy}
              />
              Table of contents
            </label>
          </div>

          <button
            type="submit"
            disabled={isBusy || !content.trim()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? 'Generating…' : 'Generate presentation'}
          </button>
        </form>

        <div className="mt-6">
          {phase === 'starting' && <StatusCard tone="info" text="Starting generation…" />}

          {phase === 'pending' && (
            <StatusCard
              tone="info"
              text={statusMessage || 'Generating your presentation…'}
              detail={
                progress.created !== null
                  ? `${progress.created} slide${progress.created === 1 ? '' : 's'} created${
                      progress.remaining ? `, ${progress.remaining} remaining` : ''
                    }`
                  : undefined
              }
              spinner
            />
          )}

          {phase === 'error' && <StatusCard tone="error" text={errorText || 'Something went wrong.'} />}

          {phase === 'completed' && result && (
            <StatusCard tone="success" text="Your presentation is ready.">
              <div className="mt-3 flex flex-wrap gap-3">
                {result.download_url && (
                  <a
                    href={result.download_url}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
                  >
                    Download {exportAs.toUpperCase()}
                  </a>
                )}
                {result.edit_url && (
                  <a
                    href={
                      result.edit_url.startsWith('http')
                        ? result.edit_url
                        : `${new URL(result.download_url || 'http://localhost:5001').origin}${result.edit_url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open in editor ↗
                  </a>
                )}
              </div>
            </StatusCard>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  tone,
  text,
  detail,
  spinner,
  children,
}: {
  tone: 'info' | 'success' | 'error';
  text: string;
  detail?: string;
  spinner?: boolean;
  children?: React.ReactNode;
}) {
  const styles = {
    info: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-red-200 bg-red-50 text-red-900',
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <div className="flex items-center gap-2">
        {spinner && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        <span className="font-medium">{text}</span>
      </div>
      {detail && <p className="mt-1 text-xs opacity-80">{detail}</p>}
      {children}
    </div>
  );
}
