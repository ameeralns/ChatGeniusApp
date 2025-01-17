'use client';

import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { SettingsProvider } from '@/lib/contexts/SettingsContext';
import { AIAgentProvider } from '@/lib/contexts/AIAgentContext';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { useUserProfileSync } from '@/lib/hooks/useUserProfileSync';
import AIAgentAutoResponse from '@/app/components/AIAgentAutoResponse';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useUserProfileSync();

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SettingsProvider>
            <AIAgentProvider>
              <AIAgentAutoResponse />
              {children}
              <Toaster position="top-center" />
            </AIAgentProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
