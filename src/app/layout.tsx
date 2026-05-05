import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Altered TCG — FUGUE Gallery',
  description: 'Browse all non-unique cards from the FUGUE set of Altered TCG.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
