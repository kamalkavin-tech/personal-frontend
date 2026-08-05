import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { AmbientBackground } from '@/components/ambient-background';

export const metadata: Metadata = {
  title: 'VaultX — Zero-Trust Personal Vault',
  description: 'An encrypted, zero-trust vault for passwords, notes, files, and secrets. Only you can access your data.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <AmbientBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
