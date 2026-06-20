'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Case = { id: string; input: string; expected: string };

function dictate(setter: (v: string) => void, btn: HTMLButtonElement) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    alert('Voice typing works in Chrome or Edge.');
    return;
  }
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = false;
  const old = btn.textContent;
  btn.textContent = '🎙️';
  r.onresult = (e: any) => setter(e.results[0][0].transcript);
  r.onerror = () => {
    btn.textContent = old;
  };
  r.onend = () => {
    btn.textContent = old;
  };
  r.start();
}

export default function RunForm({
  featureId,
  rubricId,
  cases,
}: {
  featureId: string;
  rubricId: string;
  cases: Case[];
}) {
  const router = useRouter();
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const payload = {
      featureId,
      rubricId,
      outputs: cases.map((c) => ({ caseId: c.id, output: outputs[c.id] ?? '' })),
    };
    const res = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || 'Something went wrong');
      return;
    }
    router.push(`/runs/${data.runId}`);
  }

  return (
    <form onSubmit={submit}>
      <p className="muted">For each input, run it through your AI and paste what it gave back (or talk it in 🎤).</p>
      {cases.map((c, i) => (
        <div className="card" key={c.id}>
          <div className="muted">Case {i + 1} — input</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.input}</div>
          <label>Paste your AI&apos;s actual output</label>
          <div className="field">
            <textarea
              value={outputs[c.id] ?? ''}
              onChange={(e) => setOutputs({ ...outputs, [c.id]: e.target.value })}
              required
            />
            <button
              type="button"
              className="mic"
              title="Dictate"
              onClick={(e) => dictate((v) => setOutputs((o) => ({ ...o, [c.id]: v })), e.currentTarget)}
            >
              🎤
            </button>
          </div>
        </div>
      ))}
      <button type="submit" disabled={busy}>
        {busy ? 'Grading… (this can take a moment)' : 'Grade all outputs'}
      </button>
      {err && <p style={{ color: '#dc2626', fontSize: 14 }}>{err}</p>}
    </form>
  );
}
