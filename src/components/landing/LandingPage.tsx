'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Users, Zap, Lock } from 'lucide-react';
import SignIn from '../auth/SignIn';
import { useAuth } from '@/lib/hooks/useAuth';

export default function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/workspace/welcome');
    }
  }, [user, router]);

  // If sign in is clicked, show SignIn component
  if (showSignIn) {
    return <SignIn />;
  }

  const features = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Real-time Messaging',
      description: 'Experience seamless communication with instant message delivery and real-time updates.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Team Workspaces',
      description: 'Organize your conversations in dedicated workspaces and channels for better collaboration.'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Built with the latest technology stack ensuring quick response times and smooth performance.'
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Secure',
      description: 'Your conversations are protected with enterprise-grade security and encryption.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-white text-xl font-bold">ChatGeniusApp</span>
            </div>
            <button
              onClick={() => setShowSignIn(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
            Modern Team Communication
            <span className="text-purple-500"> Reimagined</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Experience the next generation of team collaboration with ChatGeniusApp. 
            Connect, share, and work together in a seamless environment designed for modern teams.
          </p>
          <button
            onClick={() => setShowSignIn(true)}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-purple-700 transition-colors"
          >
            Start Chatting Now
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-800 p-6 rounded-lg hover:bg-gray-750 transition-colors"
            >
              <div className="text-purple-500 mb-4">{feature.icon}</div>
              <h3 className="text-white text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gray-800 rounded-xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your team communication?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of teams who have already enhanced their collaboration with ChatGeniusApp.
          </p>
          <button
            onClick={() => setShowSignIn(true)}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-purple-700 transition-colors"
          >
            Get Started for Free
          </button>
        </div>
      </div>
    </div>
  );
} 