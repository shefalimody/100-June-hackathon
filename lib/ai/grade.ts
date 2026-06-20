// The AI judge (Option A): grades a PASTED output against the expected answer + rubric,
// and acts as a coach — nudging the builder, plus a copy-paste fix.
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, Output } from 'ai';
import { z } from 'zod';

// Hyphenated id is correct for the direct @ai-sdk/anthropic provider.
export const JUDGE_MODEL = 'claude-sonnet-4-6';

export const GradeSchema = z.object({
  verdict: z.enum(['pass', 'fail']),
  overall_reason: z.string(),
  coaching_nudge: z.string(),
  suggested_fix: z.string(),
  dimension_scores: z.array(
    z.object({
      dimension: z.string(),
      verdict: z.enum(['pass', 'fail']),
      reason: z.string(),
    }),
  ),
});
export type Grade = z.infer<typeof GradeSchema>;

export type Dimension = { name: string; passing_criteria: string };

export async function gradeOutput(params: {
  dimensions: Dimension[];
  input: string;
  expected: string;
  actualOutput: string;
}): Promise<Grade> {
  const { dimensions, input, expected, actualOutput } = params;
  const rubricText = dimensions.map((d) => `- ${d.name}: ${d.passing_criteria}`).join('\n');

  const { output } = await generateText({
    model: anthropic(JUDGE_MODEL),
    output: Output.object({ schema: GradeSchema }),
    system:
      'You are a strict, calibrated evaluator of AI outputs, and a kind coach. Grade the ACTUAL ' +
      'output against the expected answer and the rubric. Be honest and skeptical — do NOT pass an ' +
      'output just because it reads well. If it fails ANY rubric dimension, the overall verdict is ' +
      '"fail". Use short, plain English a non-technical person can act on.\n' +
      'Always also provide:\n' +
      '- coaching_nudge: a short, friendly question that helps the builder work out the fix ' +
      'THEMSELVES. Do NOT give away the answer here — guide their thinking.\n' +
      '- suggested_fix: the concrete change to make, written so they can copy-paste it — usually a ' +
      'sentence to add to their AI prompt, or a guardrail to add.\n\n' +
      'Rubric dimensions:\n' +
      rubricText,
    prompt:
      `INPUT given to the feature:\n${input}\n\n` +
      `EXPECTED (the human-written good answer):\n${expected}\n\n` +
      `ACTUAL output to grade:\n${actualOutput}`,
  });

  return output;
}
