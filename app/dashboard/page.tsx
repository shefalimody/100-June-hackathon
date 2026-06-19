import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

async function createFeature(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  if (!name) return;
  const { data } = await supabase.from('features').insert({ user_id: user.id, name, description }).select().single();
  revalidatePath('/dashboard');
  if (data) redirect(`/features/${data.id}`);
}

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: features } = await supabase.from('features').select('*').order('created_at', { ascending: false });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Your AI features</h1>
        <form action={signOut}>
          <button className="secondary" style={{ marginTop: 0 }}>Sign out</button>
        </form>
      </div>
      <p className="muted">Each one is an AI feature you want to check. Add a feature to start.</p>

      {features && features.length > 0 ? (
        <div className="card">
          {features.map((f) => (
            <div key={f.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <Link href={`/features/${f.id}`} style={{ fontWeight: 600 }}>{f.name}</Link>
              {f.description && <div className="muted">{f.description}</div>}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No features yet — add your first below.</p>
      )}

      <div className="card">
        <h2>Add a feature</h2>
        <form action={createFeature}>
          <label>What does this AI do? (a short name)</label>
          <input name="name" placeholder="e.g. Timezone answer bot" required />
          <label>Description (optional)</label>
          <input name="description" placeholder="e.g. Tells you the time difference between two cities" />
          <button type="submit">Create feature</button>
        </form>
      </div>
    </>
  );
}
