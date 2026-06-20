import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const TEXT_TEMPLATE = [
  'Correctness :: The output matches the known-good answer',
  'Groundedness :: Every claim is supported by the real source/data — nothing invented',
  'In-context :: It answers the actual question; does not assume or drift',
  'Completeness :: It includes everything that matters and omits nothing critical',
  'Format :: It has the right structure (e.g. correct format, valid fields)',
].join('\n');

function parseDimensions(raw: string) {
  return raw.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const [name, ...rest] = line.split('::');
    return { name: (name || '').trim(), passing_criteria: rest.join('::').trim() };
  }).filter((d) => d.name);
}

async function saveRubric(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const featureId = String(formData.get('featureId'));
  const dimensions = parseDimensions(String(formData.get('dimensions') || ''));
  const { data: existing } = await supabase.from('rubrics').select('id').eq('feature_id', featureId).maybeSingle();
  if (existing) {
    await supabase.from('rubrics').update({ dimensions }).eq('id', existing.id);
  } else {
    await supabase.from('rubrics').insert({ feature_id: featureId, user_id: user.id, dimensions });
  }
  redirect(`/features/${featureId}`);
}

export default async function RubricPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: rubric } = await supabase.from('rubrics').select('dimensions').eq('feature_id', id).maybeSingle();
  const existingText = rubric?.dimensions?.length
    ? (rubric.dimensions as { name: string; passing_criteria: string }[]).map((d) => `${d.name} :: ${d.passing_criteria}`).join('\n')
    : TEXT_TEMPLATE;

  return (
    <>
      <p className="muted"><Link href={`/features/${id}`}>← Back to feature</Link></p>
      <h1>Rubric — how to grade</h1>
      <div className="tip">📏 <strong>How should Evalmate decide an answer is “good”?</strong> Each line is one thing to check. We&apos;ve filled in a solid starter set — keep it, tweak it, or add your own. Format: <strong>Name :: passes when…</strong></div>
      <form action={saveRubric}>
        <input type="hidden" name="featureId" value={id} />
        <textarea name="dimensions" defaultValue={existingText} style={{ minHeight: 200 }} />
        <button type="submit">Save rubric</button>
      </form>
    </>
  );
}
