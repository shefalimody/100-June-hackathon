import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eval Co-pilot',
  description: 'Is your AI actually good, or does it just run?',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
