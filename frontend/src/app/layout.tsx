import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EcoStamp — Verifiable Travel Impact',
  description: 'Earn on-chain proof of your sustainable travel. Collect SFT stamps from verified eco providers, build your reputation, and claim sBTC rewards.',
  keywords: ['eco travel', 'sustainability', 'blockchain', 'stacks', 'bitcoin', 'stamps', 'NFT'],
  openGraph: {
    title: 'EcoStamp',
    description: 'Verifiable Travel Impact Protocol on Stacks Bitcoin L2',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0d1f16] text-cream-200 font-body antialiased">
        {children}
      </body>
    </html>
  );
}
