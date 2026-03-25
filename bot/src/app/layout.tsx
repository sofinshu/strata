import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Strata | Unified Staff Management',
  description: 'The complete web dashboard for Strata - a staff management Discord bot SaaS platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0F1117] text-[#F0F0F3] antialiased selection:bg-[#5865F2] selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
