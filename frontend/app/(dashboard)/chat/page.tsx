'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ChatContainer } from '@/components/features/chat';

export default function ChatPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-4rem)]"
    >
      {/* Chat Container */}
      <ChatContainer className="h-full" />
    </motion.div>
  );
}
