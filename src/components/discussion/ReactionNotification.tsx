import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import challengeReaction from '@/assets/challenge-reaction.png';
import agreeReaction from '@/assets/agree-reaction.png';
import sourceRequestReaction from '@/assets/source-request-reaction.png';

type ReactionType = 'challenged' | 'agreed' | 'source_requested';

interface ReactionNotificationProps {
  type: ReactionType;
  onComplete?: () => void;
}

export const ReactionNotification = ({ type, onComplete }: ReactionNotificationProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => onComplete?.(), 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getImage = () => {
    switch (type) {
      case 'challenged':
        return challengeReaction;
      case 'agreed':
        return agreeReaction;
      case 'source_requested':
        return sourceRequestReaction;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'challenged':
        return '⚔️ CHALLENGED!';
      case 'agreed':
        return '✅ AGREED!';
      case 'source_requested':
        return '❓ SOURCE REQUESTED!';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'challenged':
        return 'hsl(var(--destructive))';
      case 'agreed':
        return 'hsl(var(--success))';
      case 'source_requested':
        return 'hsl(var(--warning))';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: 1,
            rotate: 0,
          }}
          exit={{ 
            scale: 0,
            opacity: 0,
            rotate: 180,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 0.6
          }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShow(false)}
          />

          {/* Radial burst effect */}
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ 
              scale: [1, 2.5],
              opacity: [0.8, 0]
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut"
            }}
            className="absolute w-96 h-96 rounded-full"
            style={{
              background: `radial-gradient(circle, ${getColor()}, transparent 70%)`,
            }}
          />

          {/* Main content */}
          <motion.div
            initial={{ y: 50 }}
            animate={{ 
              y: [50, -10, 0],
            }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 300,
              damping: 15
            }}
            className="relative flex flex-col items-center gap-6 pointer-events-auto"
          >
            {/* Image with animations */}
            <motion.div
              animate={{
                rotate: type === 'challenged' ? [0, -5, 5, -5, 5, 0] : 0,
                scale: type === 'agreed' ? [1, 1.1, 1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 0.6,
                repeat: type === 'source_requested' ? Infinity : 0,
                repeatDelay: 1
              }}
              className="relative"
            >
              <motion.img
                src={getImage()}
                alt={getTitle()}
                className="w-80 h-80 object-contain drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.3))'
                }}
              />
              
              {/* Glow effect */}
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [0.9, 1.1, 0.9],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full blur-3xl -z-10"
                style={{
                  background: getColor(),
                }}
              />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-bold tracking-wider"
              style={{
                color: getColor(),
                textShadow: `0 0 20px ${getColor()}, 0 0 40px ${getColor()}`,
              }}
            >
              {getTitle()}
            </motion.h2>

            {/* Floating particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  x: Math.cos((i * 2 * Math.PI) / 12) * 150,
                  y: Math.sin((i * 2 * Math.PI) / 12) * 150,
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.3 + (i * 0.05),
                  ease: "easeOut"
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  background: getColor(),
                  boxShadow: `0 0 10px ${getColor()}`,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
