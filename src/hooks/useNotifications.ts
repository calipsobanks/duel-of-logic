import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Notification sound URL (free sound effect)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const useNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [hasNewNotification, setHasNewNotification] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  const triggerVibration = useCallback(() => {
    try {
      // Check if Vibration API is supported
      if ('vibrate' in navigator) {
        // Vibration pattern: vibrate 200ms, pause 100ms, vibrate 200ms
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.log('Vibration not supported:', error);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const clearNewNotification = useCallback(() => {
    setHasNewNotification(false);
  }, []);

  const showNotification = useCallback((title: string, body: string, onClick?: () => void) => {
    // Play sound for all notifications
    playNotificationSound();
    
    // Trigger vibration on mobile devices
    triggerVibration();
    
    // Set badge indicator
    setHasNewNotification(true);

    if (permission !== 'granted') {
      // Fallback to toast if no permission
      toast(title, { description: body });
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'debate-notification',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        onClick?.();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error('Error showing notification:', error);
      toast(title, { description: body });
    }
  }, [permission, playNotificationSound, triggerVibration]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime notifications for user:', user.id);

    const channel = supabase
      .channel('app-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'debates',
        },
        async (payload) => {
          console.log('New debate received:', payload);
          
          const newDebate = payload.new as any;

          // Only notify if the current user is debater2 (the one being invited)
          if (newDebate.debater2_id !== user.id) return;

          // Get the initiator's profile
          const { data: initiator } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newDebate.debater1_id)
            .single();

          showNotification(
            '🎯 New Discussion Invite!',
            `@${initiator?.username || 'Someone'} wants to debate: "${newDebate.topic?.slice(0, 50)}..."`,
            () => {
              window.location.href = `/discussion/active?id=${newDebate.id}`;
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'evidence',
        },
        async (payload) => {
          console.log('Evidence update received:', payload);
          
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          // Only notify if the status changed
          if (newRecord.status === oldRecord.status) return;

          // Check if this evidence belongs to the current user
          if (newRecord.debater_id !== user.id) return;

          // Get debate info for context
          const { data: debate } = await supabase
            .from('debates')
            .select('topic, debater1:profiles!debates_debater1_id_fkey(username), debater2:profiles!debates_debater2_id_fkey(username)')
            .eq('id', newRecord.debate_id)
            .single();

          if (newRecord.status === 'challenged' && oldRecord.status === 'pending') {
            showNotification(
              '⚔️ Evidence Challenged!',
              `Your evidence in "${debate?.topic?.slice(0, 50)}..." has been challenged. Defend your claim!`,
              () => {
                window.location.href = `/discussion/active?id=${newRecord.debate_id}`;
              }
            );
          }

          if (newRecord.status === 'agreed' && oldRecord.status === 'pending') {
            showNotification(
              '✅ Evidence Accepted!',
              `Your evidence in "${debate?.topic?.slice(0, 50)}..." was accepted! You earned points.`,
              () => {
                window.location.href = `/discussion/active?id=${newRecord.debate_id}`;
              }
            );
          }

          if (newRecord.status === 'validated' && oldRecord.status === 'challenged') {
            showNotification(
              '🏆 Evidence Validated!',
              `Your challenged evidence in "${debate?.topic?.slice(0, 50)}..." was validated! You defended successfully.`,
              () => {
                window.location.href = `/discussion/active?id=${newRecord.debate_id}`;
              }
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification channel status:', status);
      });

    return () => {
      console.log('Cleaning up notification channel');
      supabase.removeChannel(channel);
    };
  }, [user, showNotification]);

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window,
    hasNewNotification,
    clearNewNotification,
  };
};
