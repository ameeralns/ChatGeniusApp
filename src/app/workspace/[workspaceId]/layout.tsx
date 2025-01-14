'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import Loading from '@/components/ui/loading';

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        // Verify workspace exists and user has access
        const workspaceRef = ref(db, `workspaces/${params.workspaceId}`);
        const workspaceSnapshot = await get(workspaceRef);

        if (!workspaceSnapshot.exists()) {
          router.replace('/workspace/welcome');
          return;
        }

        // Check if user has access to this workspace
        const userWorkspaceRef = ref(db, `users/${user.uid}/workspaces/${params.workspaceId}`);
        const userWorkspaceSnapshot = await get(userWorkspaceRef);

        if (!userWorkspaceSnapshot.exists()) {
          router.replace('/workspace/welcome');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking workspace access:', error);
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, authLoading, params.workspaceId, router]);

  if (loading || authLoading) {
    return <Loading message="Loading..." />;
  }

  return children;
} 