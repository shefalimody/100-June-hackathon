import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CoachFix from '@/components/CoachFix';

type DimScore = { dimension: string; verdict: string; reason: string };

export default async function RunResults({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: run } = await supabase.from('runs').select('*').eq('id', runId).single();
  if (!run) redirect('/dashboard');

  const { data: grades } = await supabase.from('grades').select('*').eq('run_id', runId);
  const { data: cases } = await supabase
    .from('golden_cases')
    .select('id, input, expected')
    .eq('feature_id', run.feature_id);
  const caseById = new Map((cases ?? []).map((c) => [c.id, c]));

  const total = run.total_cases ?? grades?.length ?? 0;
  const passed = run.passed_cases ?? 0;
  const pct = total ? Math.round((passed / total) * 100) : 0;
  const failures = (grades ?? []).filter((g) => g.verdict === 'fail');
  const cal: number | null = run.calibration_accuracy;

  return (
    <>
      <p className="muted">
        <Link href={`/features/${run.feature_id}`}>← Back to feature</Link>
      </p>
      <h1>Your results</h1>

      <div className="card">
        <div className="score">
          {passed} / {total} <span className="muted" style={{ fontSize: 18 }}>passed ({pct}%)</span>
        </div>
        {cal === null ? (
          <p className="muted">No calibration cases yet — add a known-pass and a known-fail case so we can prove the AI grader is trustworthy.</p>
        ) : cal >= 0.7 ? (
          <span className="badge good">Trust check passed — the grader got {Math.round(cal * 100)}% of your known answers right</span>
        ) : (
          <span className="badge warn">⚠ Don&apos;t fully trust these yet — the grader only got {Math.round(cal * 100)}% of your known answers right. Review your rubric.</span>
        )}
      </div>

      <h2>The failures you were about to ship ({failures.length})</h2>
      {failures.length === 0 ? (
        <p className="muted">Nothing failed in this run. Either it&apos;s solid — or your rubric is too easy.</p>
      ) : (
        failures.map((g) => {
          const c = caseById.get(g.case_id);
          const dims = (g.dimension_scores ?? []) as DimScore[];
          return (
            <div className="card fail-card" key={g.id}>
              <div className="muted" style={{ marginTop: 0 }}>Input</div>
              <div style={{ fontWeight: 600 }}>{c?.input}</div>
              <div className="muted" style={{ marginTop: 8 }}>What your AI said</div>
              <div>{g.actual_output}</div>
              <div className="muted" style={{ marginTop: 8 }}>Why it failed</div>
              <div className="fail">{g.overall_reason}</div>
              {g.coaching_nudge && g.suggested_fix && (
                <CoachFix nudge={g.coaching_nudge} fix={g.suggested_fix} />
              )}
              {dims.length > 0 && (
                <table style={{ marginTop: 14 }}>
                  <tbody>
                    {dims.map((d, i) => (
                      <tr key={i}>
                        <td style={{ width: 130 }}>{d.dimension}</td>
                        <td className={d.verdict === 'pass' ? 'pass' : 'fail'} style={{ width: 60 }}>{d.verdict}</td>
                        <td>{d.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}

      <div className="card">
        {failures.length === 0 ? (
          <><strong>🎉 All clear.</strong> Your AI passed every case here — nothing to fix.</>
        ) : (
          <><strong>That&apos;s everything you need.</strong> Copy the fix on each failure above into
          your AI&apos;s prompt or settings — that&apos;s the whole job done.</>
        )}
      </div>
    </>
  );
}
