'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const fn =
      mode === 'in'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    if (mode === 'up') {
      setMsg('Account created. If email confirmation is on, check your inbox — otherwise sign in.');
      setMode('in');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '60px auto' }}>
      <h1>Eval Co-pilot</h1>
      <p className="muted">Is your AI actually good, or does it just run? Let&apos;s find out.</p>
      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>
        {mode === 'in' ? 'New here? ' : 'Already have an account? '}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>
          {mode === 'in' ? 'Create an account' : 'Sign in'}
        </a>
      </p>
      {msg && <p style={{ color: '#dc2626', fontSize: 14 }}>{msg}</p>}
    </div>
  );
}
