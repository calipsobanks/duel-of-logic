import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'hidden_discussions';

export const useHiddenDiscussions = () => {
  const { user } = useAuth();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  // Load hidden discussions from localStorage on mount
  useEffect(() => {
    if (!user) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (stored) {
        setHiddenIds(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading hidden discussions:', error);
    }
  }, [user]);

  // Save to localStorage whenever hiddenIds changes
  const saveToStorage = useCallback((ids: string[]) => {
    if (!user) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(ids));
    } catch (error) {
      console.error('Error saving hidden discussions:', error);
    }
  }, [user]);

  const hideDiscussion = useCallback((discussionId: string) => {
    setHiddenIds(prev => {
      const newIds = [...prev, discussionId];
      saveToStorage(newIds);
      return newIds;
    });
  }, [saveToStorage]);

  const unhideDiscussion = useCallback((discussionId: string) => {
    setHiddenIds(prev => {
      const newIds = prev.filter(id => id !== discussionId);
      saveToStorage(newIds);
      return newIds;
    });
  }, [saveToStorage]);

  const isHidden = useCallback((discussionId: string) => {
    return hiddenIds.includes(discussionId);
  }, [hiddenIds]);

  const unhideAll = useCallback(() => {
    setHiddenIds([]);
    saveToStorage([]);
  }, [saveToStorage]);

  return {
    hiddenIds,
    hideDiscussion,
    unhideDiscussion,
    isHidden,
    unhideAll,
    hiddenCount: hiddenIds.length,
  };
};
