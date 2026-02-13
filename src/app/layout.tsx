import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { DensityProvider } from '@/components/density-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Cornerstone OS',
  description: 'Operations + Finance + Vendor Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="cornerstone-theme">
          <DensityProvider defaultDensity="compact" storageKey="cornerstone-density">
            {children}
          </DensityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
