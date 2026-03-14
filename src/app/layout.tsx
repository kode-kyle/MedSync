import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedSync — TRN-Linked Centralized Health System',
  description: 'Synchronizing Health Care across Jamaica with TRN-linked patient records.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen" style={{ background: '#0d0d1a' }}>
        {children}
      </body>
    </html>
  );
}
