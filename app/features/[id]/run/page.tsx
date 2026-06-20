import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import RunForm from '@/components/RunForm';

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: cases } = await supabase.from('golden_cases').select('id, input, expected').eq('feature_id', id).order('created_at');
  const { data: rubric } = await supabase.from('rubrics').select('id').eq('feature_id', id).maybeSingle();

  if (!cases || cases.length === 0 || !rubric) redirect(`/features/${id}`);

  return (
    <>
      <p className="muted"><Link href={`/features/${id}`}>← Back to feature</Link></p>
      <h1>Run the check</h1>
      <div className="tip">🔍 <strong>Why this step?</strong> You&apos;re about to show Evalmate what your AI <em>actually</em> said, so it can grade each answer against the good answer you wrote. This is the moment you find out whether your AI is actually good — or just sounds good.</div>
      <RunForm featureId={id} rubricId={rubric.id} cases={cases} />
    </>
  );
}
