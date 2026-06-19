import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

async function addCase(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const featureId = String(formData.get('featureId'));
  const input = String(formData.get('input') || '').trim();
  const expected = String(formData.get('expected') || '').trim();
  const isCal = formData.get('is_calibration') === 'on';
  const calVerdict = isCal ? String(formData.get('calibration_verdict') || 'pass') : null;
  if (!input || !expected) return;
  await supabase.from('golden_cases').insert({ feature_id: featureId, user_id: user.id, input, expected, is_calibration: isCal, calibration_verdict: calVerdict });
  revalidatePath(`/features/${featureId}`);
}

export default async function FeaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: feature } = await supabase.from('features').select('*').eq('id', id).single();
  if (!feature) redirect('/dashboard');

  const { data: cases } = await supabase.from('golden_cases').select('*').eq('feature_id', id).order('created_at');
  const { data: rubric } = await supabase.from('rubrics').select('*').eq('feature_id', id).maybeSingle();

  const hasCases = (cases?.length ?? 0) > 0;
  const hasRubric = (rubric?.dimensions?.length ?? 0) > 0;
  const ready = hasCases && hasRubric;

  return (
    <>
      <p className="muted"><Link href="/dashboard">← All features</Link></p>
      <h1>{feature.name}</h1>
      {feature.description && <p className="muted">{feature.description}</p>}

      <h2>Golden set — your answer key ({cases?.length ?? 0})</h2>
      <p className="muted">The right answers, written before you test. Mark a couple as “calibration” (you already know if they pass or fail) — that&apos;s how we check the AI grader can be trusted.</p>
      {hasCases ? (
        <table>
          <thead><tr><th>Input</th><th>Good answer</th><th>Calibration?</th></tr></thead>
          <tbody>
            {cases!.map((c) => (
              <tr key={c.id}><td>{c.input}</td><td>{c.expected}</td><td>{c.is_calibration ? `yes (${c.calibration_verdict})` : '—'}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (<p className="muted">No cases yet.</p>)}

      <div className="card">
        <h2>Add a case</h2>
        <form action={addCase}>
          <input type="hidden" name="featureId" value={id} />
          <label>Input (what you give the AI)</label>
          <textarea name="input" required />
          <label>Good answer (what it SHOULD give — write this first)</label>
          <textarea name="expected" required />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
            <input type="checkbox" name="is_calibration" style={{ width: 'auto' }} />
            This is a calibration case (I already know the right verdict)
          </label>
          <label>If calibration: do you already know this one passes or fails?</label>
          <select name="calibration_verdict" defaultValue="pass">
            <option value="pass">I know it should PASS</option>
            <option value="fail">I know it should FAIL</option>
          </select>
          <button type="submit">Add case</button>
        </form>
      </div>

      <h2>Rubric — how to grade</h2>
      <p className="muted">{hasRubric ? 'Rubric is set. ' : 'No rubric yet. '}<Link href={`/features/${id}/rubric`}>{hasRubric ? 'Edit rubric' : 'Create rubric'}</Link></p>

      <h2>Run the check</h2>
      {ready ? (
        <Link className="btn" href={`/features/${id}/run`}>Paste outputs &amp; grade →</Link>
      ) : (
        <p className="muted">Add at least one golden case and a rubric to run a check.</p>
      )}
    </>
  );
}
