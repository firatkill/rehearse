import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import './globals.css';

export default async function RootLayout({ children }: { children: ReactNode }) {
  (await headers()).get('x-nonce');
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
