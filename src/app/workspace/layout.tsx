'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import WorkspaceSidebar from '@/components/layout/WorkspaceSidebar';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workspaceId = params?.workspaceId as string;

  useEffect(() => {
    if (authLoading) return; // Wait until the auth state is determined

    if (!user) {
      router.replace('/login'); // Use replace to prevent adding to the history stack
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return null; // Render nothing while redirecting or loading
  }

  return (
    <div className="h-screen flex">
      <WorkspaceSidebar activeWorkspaceId={workspaceId} />
      {children}
    </div>
  );
} 