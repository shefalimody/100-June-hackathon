'use client';

import { useState } from 'react';

// Fix-tool-first: hand the user the fix directly (no "crack it yourself" gate).
// The "why" is kept as an optional footnote for anyone who wants to learn — never a blocker.
export default function CoachFix({ nudge, fix }: { nudge: string; fix: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="coach">
      <div className="who">🛠 Here&apos;s your fix — copy &amp; paste it</div>
      <div style={{ marginBottom: 10 }}>{fix}</div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          navigator.clipboard.writeText(fix);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? '✓ Copied' : 'Copy the fix'}
      </button>
      {nudge && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
          💡 Want to understand why? {nudge}
        </p>
      )}
    </div>
  );
}
