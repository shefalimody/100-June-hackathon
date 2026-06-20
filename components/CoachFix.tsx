'use client';

import { useState } from 'react';

export default function CoachFix({ nudge, fix }: { nudge: string; fix: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="coach">
      <div className="who">🧠 Coach&apos;s nudge — try to crack it yourself first</div>
      <div>{nudge}</div>
      {!show ? (
        <button type="button" className="btn secondary" onClick={() => setShow(true)}>
          Just show me the fix →
        </button>
      ) : (
        <div className="reveal">
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
        </div>
      )}
    </div>
  );
}
