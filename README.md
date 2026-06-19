# Eval Co-pilot

*Is your AI actually good, or does it just run?*

A tool that helps a non-technical builder decide **what good looks like** for their AI feature —
write a golden set + rubric, paste the AI's outputs, and get back the exact failures they were
about to ship, in plain English with what to fix. Built for 100x Cohort 7 — **Track B**.

## Setup
1. Create a Supabase project at supabase.com.
2. In the Supabase SQL Editor, run `supabase/migrations/001_initial_schema.sql` (tables + RLS).
3. Copy `.env.example` to `.env.local` and fill: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Settings → API), `ANTHROPIC_API_KEY`.
4. `npm install` then `npm run dev` → http://localhost:3000

## The design boundary (Move 3)
- **Computer decides (fixed):** golden set, rubric, run records, grade↔case↔run links, the
  pass/fail tally, calibration accuracy, Row-Level Security.
- **AI decides (judgment):** reading a pasted output and deciding pass/fail vs the rubric.
- **Anti-rubber-stamp:** calibration cases carry a verdict you already know; we check the grader
  gets those right before trusting it on new cases.

## Two-user security test (Move 4)
Sign up as User A (create a feature + case). As User B (incognito), try to read User A's rows →
empty (RLS). Screenshot the empty result.

## Tech
Next.js 15 · Supabase (auth + Postgres + RLS) · Vercel AI SDK + Claude · TypeScript.
