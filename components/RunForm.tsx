'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Case = { id: string; input: string; expected: string };

export default function RunForm({ featureId, rubricId, cases }: { featureId: string; rubricId: string; cases: Case[] }) {
  const router = useRouter();
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const payload = { featureId, rubricId, outputs: cases.map((c) => ({ caseId: c.id, output: outputs[c.id] ?? '' })) };
    const res = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || 'Something went wrong'); return; }
    router.push(`/runs/${data.runId}`);
  }

  return (
    <form onSubmit={submit}>
      <p className="muted">For each input, run it through your AI and paste what it gave back. We&apos;ll grade each one against your answer key + rubric.</p>
      {cases.map((c, i) => (
        <div className="card" key={c.id}>
          <div className="muted">Case {i + 1} — input</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.input}</div>
          <label>Paste your AI&apos;s actual output</label>
          <textarea value={outputs[c.id] ?? ''} onChange={(e) => setOutputs({ ...outputs, [c.id]: e.target.value })} required />
        </div>
      ))}
      <button type="submit" disabled={busy}>{busy ? 'Grading… (this can take a moment)' : 'Grade all outputs'}</button>
      {err && <p style={{ color: '#dc2626', fontSize: 14 }}>{err}</p>}
    </form>
  );
}
