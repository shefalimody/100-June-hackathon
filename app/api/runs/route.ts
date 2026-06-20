// The core loop (Option A). The builder pastes one output per golden case; we grade each.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gradeOutput, type Dimension } from '@/lib/ai/grade';

export const maxDuration = 300;

type PastedOutput = { caseId: string; output: string };

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { featureId, rubricId, outputs } = (await req.json()) as {
    featureId: string;
    rubricId: string;
    outputs: PastedOutput[];
  };
  if (!featureId || !rubricId || !Array.isArray(outputs)) {
    return NextResponse.json({ error: 'Missing featureId, rubricId, or outputs' }, { status: 400 });
  }

  const { data: rubric } = await supabase
    .from('rubrics')
    .select('dimensions')
    .eq('id', rubricId)
    .single();
  const { data: cases } = await supabase
    .from('golden_cases')
    .select('*')
    .eq('feature_id', featureId);

  if (!rubric || !cases || cases.length === 0) {
    return NextResponse.json({ error: 'Rubric or golden cases not found' }, { status: 404 });
  }
  const dimensions = (rubric.dimensions ?? []) as Dimension[];

  const { data: run, error: runErr } = await supabase
    .from('runs')
    .insert({ feature_id: featureId, user_id: user.id, rubric_id: rubricId, status: 'running' })
    .select()
    .single();
  if (runErr || !run) {
    return NextResponse.json({ error: 'Could not create run' }, { status: 500 });
  }

  const outputById = new Map(outputs.map((o) => [o.caseId, o.output]));
  let passed = 0;
  let calibrationTotal = 0;
  let calibrationCorrect = 0;

  try {
    for (const c of cases) {
      const actual = outputById.get(c.id) ?? '';
      const grade = await gradeOutput({
        dimensions,
        input: c.input,
        expected: c.expected,
        actualOutput: actual,
      });
      if (grade.verdict === 'pass') passed++;

      if (c.is_calibration && c.calibration_verdict) {
        calibrationTotal++;
        if (grade.verdict === c.calibration_verdict) calibrationCorrect++;
      }

      await supabase.from('grades').insert({
        run_id: run.id,
        case_id: c.id,
        user_id: user.id,
        actual_output: actual,
        verdict: grade.verdict,
        dimension_scores: grade.dimension_scores,
        overall_reason: grade.overall_reason,
        coaching_nudge: grade.coaching_nudge,
        suggested_fix: grade.suggested_fix,
      });
    }

    const calibrationAccuracy = calibrationTotal > 0 ? calibrationCorrect / calibrationTotal : null;

    await supabase
      .from('runs')
      .update({
        status: 'complete',
        total_cases: cases.length,
        passed_cases: passed,
        calibration_accuracy: calibrationAccuracy,
      })
      .eq('id', run.id);

    return NextResponse.json({ runId: run.id });
  } catch (e) {
    await supabase.from('runs').update({ status: 'error' }).eq('id', run.id);
    return NextResponse.json({ error: 'Grading failed', detail: String(e) }, { status: 500 });
  }
}
