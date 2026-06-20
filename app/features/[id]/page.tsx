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
  // One control now: 'none' | 'pass' | 'fail'. A case counts as calibration only if a known verdict is set,
  // so a verdict can never be silently dropped (the old checkbox + separate dropdown could mismatch).
  const calVerdict = String(formData.get('calibration_verdict') || 'none');
  const isCal = calVerdict === 'pass' || calVerdict === 'fail';
  if (!input || !expected) return;
  // Skip exact duplicates of the same input for this feature.
  const { data: dupe } = await supabase.from('golden_cases').select('id').eq('feature_id', featureId).eq('input', input).maybeSingle();
  if (dupe) { revalidatePath(`/features/${featureId}`); return; }
  await supabase.from('golden_cases').insert({ feature_id: featureId, user_id: user.id, input, expected, is_calibration: isCal, calibration_verdict: calVerdict });
  revalidatePath(`/features/${featureId}`);
}

async function deleteCase(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const caseId = String(formData.get('caseId'));
  const featureId = String(formData.get('featureId'));
  await supabase.from('golden_cases').delete().eq('id', caseId);
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

      <div className="tip">📝 <strong>Step 2 — build your “answer key.”</strong> Add a few real questions you&apos;d ask this AI, and what a <em>good</em> answer looks like. Write the good answer <em>before</em> you test — that&apos;s the whole trick.</div>

      <h2>Golden set — your answer key ({cases?.length ?? 0})</h2>
      {hasCases ? (
        <table>
          <thead><tr><th>Input</th><th>Good answer</th><th>Calibration?</th><th></th></tr></thead>
          <tbody>
            {cases!.map((c) => (
              <tr key={c.id}>
                <td>{c.input}</td>
                <td>{c.expected}</td>
                <td>{c.is_calibration ? `yes (${c.calibration_verdict})` : '—'}</td>
                <td>
                  <form action={deleteCase}>
                    <input type="hidden" name="caseId" value={c.id} />
                    <input type="hidden" name="featureId" value={id} />
                    <button className="trash" title="Delete this case">🗑</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (<p className="muted">No cases yet — add your first below.</p>)}

      <div className="card">
        <h2>Add a case</h2>
        <form action={addCase}>
          <input type="hidden" name="featureId" value={id} />
          <label>Input — a question or request you&apos;d give the AI</label>
          <textarea name="input" placeholder="e.g. I have oily skin — what&apos;s a simple morning routine?" required />
          <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Use a <strong>real</strong> prompt you&apos;d actually send your AI — not a made-up demo. Fake inputs give fake results.</p>
          <label>Good answer — what it SHOULD say (write this first)</label>
          <textarea name="expected" placeholder="e.g. Gentle cleanser, oil-free moisturiser, SPF 30+; salicylic acid for breakouts; see a derm if severe." required />
          <label>Do you already know the right verdict for this case? <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <select name="calibration_verdict" defaultValue="none">
            <option value="none">No — just a normal case</option>
            <option value="pass">Yes — I know it should PASS</option>
            <option value="fail">Yes — I know it should FAIL</option>
          </select>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Tip: add one case you KNOW should pass and one you KNOW should fail — that&apos;s how Evalmate proves its grader can be trusted (your “trust check”).</p>
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
