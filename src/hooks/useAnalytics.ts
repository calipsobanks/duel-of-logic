import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAnalytics = () => {
  const { user, session } = useAuth();

  const trackEvent = async (eventType: string, eventTarget: string) => {
    if (!user || !session) return;

    try {
      // Get username from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      // Get device info
      const deviceInfo = `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`;

      // Insert analytics event
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        username: profile?.username || 'Unknown',
        event_type: eventType,
        event_target: eventTarget,
        device_info: deviceInfo,
      });
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  };

  // Track clicks on buttons, links, and tabs
  useEffect(() => {
    if (!user) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is on a button, link, or tab
      const button = target.closest('button');
      const link = target.closest('a');
      const tab = target.closest('[role="tab"]');
      
      if (button) {
        const buttonText = button.textContent?.trim() || button.getAttribute('aria-label') || 'Unknown Button';
        trackEvent('button_click', buttonText);
      } else if (link) {
        const href = link.getAttribute('href') || 'Unknown Link';
        trackEvent('link_click', href);
      } else if (tab) {
        const tabText = tab.textContent?.trim() || 'Unknown Tab';
        trackEvent('tab_click', tabText);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [user]);

  return { trackEvent };
};
