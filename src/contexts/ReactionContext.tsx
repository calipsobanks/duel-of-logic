import { createContext, useContext, useState, ReactNode } from 'react';
import { ReactionNotification } from '@/components/discussion/ReactionNotification';

type ReactionType = 'challenged' | 'agreed' | 'source_requested' | 'low_rating' | 'high_rating';

interface ReactionContextType {
  showReaction: (type: ReactionType) => void;
}

const ReactionContext = createContext<ReactionContextType | undefined>(undefined);

export const ReactionProvider = ({ children }: { children: ReactNode }) => {
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);

  const showReaction = (type: ReactionType) => {
    setCurrentReaction(type);
  };

  const handleComplete = () => {
    setCurrentReaction(null);
  };

  return (
    <ReactionContext.Provider value={{ showReaction }}>
      {children}
      {currentReaction && (
        <ReactionNotification
          type={currentReaction}
          onComplete={handleComplete}
        />
      )}
    </ReactionContext.Provider>
  );
};

export const useReaction = () => {
  const context = useContext(ReactionContext);
  if (!context) {
    throw new Error('useReaction must be used within ReactionProvider');
  }
  return context;
};
