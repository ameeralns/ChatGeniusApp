'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserWorkspaces } from '@/lib/firebase/database';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MessageSquare, Users, Zap, Shield, Bot, Globe2, Sparkles, ArrowRight } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8 }
};

const features = [
  {
    title: "Real-time Chat",
    description: "Experience seamless communication with instant message delivery and real-time presence indicators.",
    icon: MessageSquare,
    color: "from-violet-500 to-fuchsia-500"
  },
  {
    title: "Smart AI Integration",
    description: "Powered by advanced AI to enhance your conversations, automate tasks, and provide intelligent suggestions.",
    icon: Bot,
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "Enterprise Security",
    description: "End-to-end encryption and advanced security protocols keep your conversations and data private.",
    icon: Shield,
    color: "from-green-500 to-emerald-500"
  },
  {
    title: "Global Connectivity",
    description: "Connect with team members across the globe with low-latency communication and automatic language translation.",
    icon: Globe2,
    color: "from-orange-500 to-red-500"
  },
  {
    title: "Team Collaboration",
    description: "Powerful tools for team coordination including channels, threads, and workspace organization.",
    icon: Users,
    color: "from-pink-500 to-rose-500"
  },
  {
    title: "Lightning Fast",
    description: "Built with cutting-edge technology ensuring quick message delivery and smooth performance.",
    icon: Zap,
    color: "from-yellow-500 to-amber-500"
  }
];

const stats = [
  { number: "99.9%", label: "Uptime" },
  { number: "150ms", label: "Latency" },
  { number: "10M+", label: "Messages/Day" },
  { number: "50K+", label: "Active Users" }
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (!loading && user) {
        try {
          const workspaces = await getUserWorkspaces(user.uid);
          if (workspaces.length > 0) {
            router.push(`/workspace/${workspaces[0].id}/channel/general`);
          } else {
            router.push('/workspace/welcome');
          }
        } catch (error) {
          console.error('Error checking workspaces:', error);
          router.push('/workspace/welcome');
        }
      }
    };

    checkUserAndRedirect();
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] via-[#1A1F3C] to-[#0A0F1C] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] via-[#1A1F3C] to-[#0A0F1C] flex flex-col relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10"
        />
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: -100, y: Math.random() * window.innerHeight }}
            animate={{
              x: window.innerWidth + 100,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: Math.random() * 10 + 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute w-[2px] h-[2px] bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-sm"
          />
        ))}
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 text-center relative z-10 py-20">
        <motion.div {...fadeInUp}>
          <motion.h1
            className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 mb-6"
            initial={{ backgroundPosition: "0%" }}
            animate={{ backgroundPosition: "100%" }}
            transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
          >
            ChatGeniusApp
          </motion.h1>
        </motion.div>

        <motion.p
          {...fadeInUp}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl text-[#B5BAC1] mb-12 max-w-3xl leading-relaxed"
        >
          Experience the future of communication. Connect, collaborate, and create in a space where innovation meets conversation.
        </motion.p>

        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.4 }}
          className="space-x-6"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/login')}
            className="px-10 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/50 transition-all duration-300"
          >
            Get Started
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/login')}
            className="px-10 py-4 bg-[#1E2030] text-white rounded-xl font-medium border border-violet-500/20 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/30 hover:border-violet-500/40 transition-all duration-300"
          >
            Start Chatting
          </motion.button>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 max-w-5xl mx-auto"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="p-6 rounded-2xl bg-[#1E2030]/50 border border-violet-500/10 backdrop-blur-sm"
            >
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.number}</div>
              <div className="text-[#B5BAC1]">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Features Grid Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="py-20 px-4 relative z-10"
      >
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white text-center mb-16"
          >
            Powerful Features for Modern Teams
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-[#1E2030]/50 border border-violet-500/10 backdrop-blur-sm group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} p-3 mb-6`}>
                  <feature.icon className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-500 group-hover:to-fuchsia-500 transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-[#B5BAC1] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Why Choose Us Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="py-20 px-4 relative z-10 border-t border-violet-500/10"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose ChatGeniusApp?
            </h2>
            <p className="text-xl text-[#B5BAC1] max-w-3xl mx-auto">
              Built with cutting-edge technology and designed for the modern workplace
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {[
                {
                  title: "Enterprise-Grade Security",
                  description: "End-to-end encryption, SSO, and compliance with global security standards."
                },
                {
                  title: "Seamless Integration",
                  description: "Connect with your favorite tools and services without leaving the platform."
                },
                {
                  title: "AI-Powered Productivity",
                  description: "Smart features that help you work faster and more efficiently."
                },
                {
                  title: "24/7 Support",
                  description: "Our dedicated team is always here to help you succeed."
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-4 p-4 rounded-xl bg-[#1E2030]/30 border border-violet-500/10 backdrop-blur-sm"
                >
                  <Sparkles className="w-6 h-6 text-violet-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                    <p className="text-[#B5BAC1]">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-1">
                <div className="w-full h-full rounded-xl bg-[#1E2030]/50 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center p-8">
                    <h3 className="text-2xl font-bold text-white mb-4">Ready to transform your team communication?</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/login')}
                      className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2 group"
                    >
                      Get Started Now
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="py-8 border-t border-violet-500/10 text-center text-[#B5BAC1] relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-violet-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-violet-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-violet-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-violet-500/10">
            <p>© 2024 ChatGeniusApp. All rights reserved.</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
