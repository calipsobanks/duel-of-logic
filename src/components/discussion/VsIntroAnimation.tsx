import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import vsBattleImage from '@/assets/vs-battle.png';

interface VsIntroAnimationProps {
  participant1: string;
  participant2: string;
  onComplete?: () => void;
}

export const VsIntroAnimation = ({ participant1, participant2, onComplete }: VsIntroAnimationProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('VS Intro: hiding animation');
      setShow(false);
      setTimeout(() => {
        console.log('VS Intro: calling onComplete');
        onComplete?.();
      }, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-500"
        >
          {/* Background animated rays */}
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 opacity-30"
            style={{
              background: 'repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255,255,255,0.1) 10deg 20deg)',
            }}
          />

          <div className="relative flex flex-col items-center gap-8">
            {/* Participant names */}
            <div className="flex items-center justify-between w-full max-w-4xl px-8">
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="text-center"
              >
                <div className="bg-blue-600 text-white px-8 py-4 rounded-lg shadow-2xl border-4 border-black">
                  <h2 className="text-3xl font-bold">{participant1}</h2>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="text-center"
              >
                <div className="bg-red-600 text-white px-8 py-4 rounded-lg shadow-2xl border-4 border-black">
                  <h2 className="text-3xl font-bold">{participant2}</h2>
                </div>
              </motion.div>
            </div>

            {/* VS Battle Image */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.2, 1],
                rotate: 0,
              }}
              transition={{
                delay: 0.5,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              className="relative"
            >
              <motion.img
                src={vsBattleImage}
                alt="VS Battle"
                className="w-96 h-96 object-contain drop-shadow-2xl"
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Glow effect */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [0.9, 1.1, 0.9],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-yellow-300 rounded-full blur-3xl -z-10"
              />
            </motion.div>

            {/* Battle text */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, type: "spring" }}
              className="flex flex-col items-center gap-6"
            >
              <h1 className="text-5xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                LET THE DEBATE BEGIN!
              </h1>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 }}
                onClick={() => {
                  console.log('VS Intro: User clicked Start Debate button');
                  setShow(false);
                  setTimeout(() => onComplete?.(), 500);
                }}
                className="bg-white text-orange-600 px-8 py-4 rounded-full text-xl font-bold shadow-2xl border-4 border-black hover:scale-110 transition-transform active:scale-95"
              >
                Start Debate Now!
              </motion.button>
            </motion.div>

            {/* Energy particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  x: Math.random() * 800 - 400,
                  y: Math.random() * 600 - 300,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, Math.random() * 2 + 1, 0],
                  x: Math.random() * 1000 - 500,
                  y: Math.random() * 800 - 400,
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 1,
                }}
                className="absolute w-4 h-4 bg-white rounded-full"
                style={{
                  boxShadow: '0 0 20px rgba(255,255,255,0.8)',
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
