'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserWorkspaces } from '@/lib/firebase/database';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Loading from '@/components/ui/loading';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (!loading && user) {
        try {
          const workspaces = await getUserWorkspaces(user.uid);
          const redirectPath = searchParams.get('from');
          
          if (redirectPath && redirectPath.startsWith('/workspace/')) {
            router.replace(redirectPath);
          } else if (workspaces && workspaces.length > 0) {
            // User has workspaces, redirect to their first workspace's general channel
            const firstWorkspace = workspaces[0];
            router.replace(`/workspace/${firstWorkspace.id}/channel/general`);
          } else {
            // User has no workspaces, redirect to welcome page
            router.replace('/workspace/welcome');
          }
        } catch (error) {
          console.error('Error checking workspaces:', error);
          toast.error('Failed to load workspaces. Please try again.');
          router.replace('/workspace/welcome');
        }
      }
    };

    checkUserAndRedirect();
  }, [user, loading, router, searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      await signInWithGoogle();
      // No need to redirect here as the useEffect will handle it
    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast.error('Failed to sign in with Google. Please try again.');
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    if (isSignUp && (!firstName || !lastName)) {
      toast.error('Please enter your first and last name.');
      return;
    }

    try {
      setIsAuthenticating(true);
      if (isSignUp) {
        await signUpWithEmail(email, password, {
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
        });
        toast.success('Account created successfully!');
      } else {
        await signInWithEmail(email, password);
      }
      // No need to redirect here as the useEffect will handle it
    } catch (error: any) {
      console.error('Error with email auth:', error);
      toast.error(error.message || 'Authentication failed. Please try again.');
      setIsAuthenticating(false);
    }
  };

  if (loading || isAuthenticating) {
    return <Loading message={isAuthenticating ? 'Signing you in...' : 'Loading...'} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] flex flex-col p-4 relative overflow-hidden">
      {/* Header */}
      <div className="w-full fixed top-0 left-0 right-0 backdrop-blur-lg bg-white/5 border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#E0E7FF] to-white">
                  ChatGeniusApp
                </span>
              </motion.div>
            </div>
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => router.push('/')}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              Home
            </motion.button>
          </div>
        </div>
      </div>

      {/* Add padding to account for fixed header */}
      <div className="pt-16 flex-1 flex items-center justify-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[500px] h-[500px] bg-[#6366F1] rounded-full blur-[128px] opacity-20 -top-48 -left-24 animate-pulse"></div>
          <div className="absolute w-[400px] h-[400px] bg-[#8B5CF6] rounded-full blur-[128px] opacity-20 -bottom-32 -right-16 animate-pulse delay-1000"></div>
        </div>

        {/* Main content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative"
        >
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#E0E7FF] to-white">
                {isSignUp ? 'Create an Account' : 'Welcome back!'}
              </h2>
              <p className="mt-2 text-[#E0E7FF]/80">
                {isSignUp ? 'Join the conversation today!' : 'We\'re excited to see you again!'}
              </p>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-5">
              {isSignUp && (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-[#E0E7FF]">
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="mt-1 block w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent backdrop-blur-sm transition-all"
                        placeholder="First name"
                        required={isSignUp}
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-[#E0E7FF]">
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="mt-1 block w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent backdrop-blur-sm transition-all"
                        placeholder="Last name"
                        required={isSignUp}
                      />
                    </div>
                  </motion.div>
                </>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label htmlFor="email" className="block text-sm font-medium text-[#E0E7FF]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent backdrop-blur-sm transition-all"
                  placeholder="Enter your email"
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label htmlFor="password" className="block text-sm font-medium text-[#E0E7FF]">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent backdrop-blur-sm transition-all"
                  placeholder="Enter your password"
                  required
                />
              </motion.div>

              <motion.button
                type="submit"
                disabled={isAuthenticating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </motion.button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-[#E0E7FF]/60 backdrop-blur-sm">Or continue with</span>
              </div>
            </div>

            <motion.button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/10"
            >
              <FcGoogle className="w-6 h-6" />
              <span className="font-medium">Continue with Google</span>
            </motion.button>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[#E0E7FF] hover:text-white transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </div>

            <div className="mt-4 text-center text-[#E0E7FF]/60 text-sm">
              <p>
                By {isSignUp ? 'signing up' : 'logging in'}, you agree to our{' '}
                <a href="#" className="text-[#6366F1] hover:text-[#818CF8] transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-[#6366F1] hover:text-[#818CF8] transition-colors">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading message="Loading..." />}>
      <LoginPageContent />
    </Suspense>
  );
} 