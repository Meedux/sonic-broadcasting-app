'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Play, 
  Monitor, 
  Smartphone, 
  Users, 
  Zap, 
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-red-100/30" />
        
        <motion.div
          className="relative max-w-7xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Zap className="h-4 w-4" />
            <span>Revolutionary Screen Sharing Technology</span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <span className="gradient-text">Sonic Broadcasting</span>
            <br />
            <span className="text-gray-900">Redefining Live Streaming</span>
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            Experience the future of streaming with our unique PC-to-mobile screen sharing technology. 
            Stream your desktop directly to your phone for the ultimate broadcasting experience.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            <Link href="/stream">
              <Button size="xl" className="animate-pulse-red">
                <Play className="h-5 w-5 mr-2" />
                Start Streaming
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            
            <Link href="/pair">
              <Button variant="secondary" size="xl">
                <Smartphone className="h-5 w-5 mr-2" />
                Pair Device
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="relative mt-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="flex justify-center items-center space-x-8">
              <motion.div
                className="w-32 h-20 bg-white rounded-lg shadow-lg border-2 border-gray-200 flex items-center justify-center animate-float"
              >
                <Monitor className="h-8 w-8 text-red-600" />
              </motion.div>
              
              <motion.div className="flex items-center">
                <ArrowRight className="h-8 w-8 text-red-600 animate-pulse" />
              </motion.div>
              
              <motion.div
                className="w-20 h-32 bg-gradient-to-b from-red-600 to-red-700 rounded-lg shadow-lg flex items-center justify-center animate-float"
              >
                <Smartphone className="h-8 w-8 text-white" />
              </motion.div>
            </div>
            <p className="text-gray-500 text-sm mt-4">PC Screen → Mobile Device</p>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-600 to-red-700">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.div className="text-center text-white">
              <Users className="h-8 w-8 mx-auto mb-4 opacity-80" />
              <div className="text-3xl lg:text-4xl font-bold mb-2">10K+</div>
              <div className="text-red-100 text-sm font-medium">Active Streamers</div>
            </motion.div>
            <motion.div className="text-center text-white">
              <Play className="h-8 w-8 mx-auto mb-4 opacity-80" />
              <div className="text-3xl lg:text-4xl font-bold mb-2">1M+</div>
              <div className="text-red-100 text-sm font-medium">Total Streams</div>
            </motion.div>
            <motion.div className="text-center text-white">
              <Zap className="h-8 w-8 mx-auto mb-4 opacity-80" />
              <div className="text-3xl lg:text-4xl font-bold mb-2">&lt;50ms</div>
              <div className="text-red-100 text-sm font-medium">Avg. Latency</div>
            </motion.div>
            <motion.div className="text-center text-white">
              <Monitor className="h-8 w-8 mx-auto mb-4 opacity-80" />
              <div className="text-3xl lg:text-4xl font-bold mb-2">4.9★</div>
              <div className="text-red-100 text-sm font-medium">User Rating</div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}