'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Welcome from '@/components/workspace/Welcome';
import Loading from '@/components/ui/loading';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return <Loading />;
  }

  // If not authenticated, useEffect will handle redirect
  if (!user) {
    return null;
  }

  // Show welcome component for users with no workspaces
  return <Welcome />;
} 