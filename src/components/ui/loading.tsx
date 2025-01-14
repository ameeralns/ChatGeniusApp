'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LoadingProps {
  message?: string;
}

export default function Loading({ message = 'Loading...' }: LoadingProps) {
  const [windowWidth, setWindowWidth] = useState(1000);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    setIsHydrated(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] via-[#1A1F3C] to-[#0A0F1C] flex items-center justify-center relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isHydrated && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10"
            />
            {/* Animated particles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: -100, y: Math.random() * windowWidth * 0.1 }}
                animate={{
                  x: windowWidth + 100,
                  y: Math.random() * windowWidth * 0.1,
                }}
                transition={{
                  duration: Math.random() * 10 + 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute w-[2px] h-[2px] bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-sm"
              />
            ))}
          </>
        )}
      </div>

      {/* Loading spinner and message */}
      <motion.div 
        initial={false}
        animate={isHydrated ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        className="text-center relative z-10"
      >
        <div className="w-16 h-16 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#E0E7FF] text-lg font-medium">
          {message}
        </p>
      </motion.div>
    </div>
  );
} 