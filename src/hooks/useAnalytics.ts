import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const MAX_DURATION_SECONDS = 900; // 15 minutes cap

export const useAnalytics = () => {
  const { user, session } = useAuth();
  const location = useLocation();
  const entryTimeRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>(location.pathname);
  const usernameRef = useRef<string>('');

  // Helper to get discussion ID from URL
  const getDiscussionId = (): string | null => {
    const params = new URLSearchParams(location.search);
    return params.get('id');
  };

  // Helper to get current page context
  const getPageContext = (): string => {
    const path = location.pathname;
    if (path.includes('/discussion/active')) return 'Active Discussion';
    if (path.includes('/discussion/public')) return 'Public Discussion';
    if (path.includes('/discussion/group')) return 'Group Discussion';
    if (path.includes('/discussions')) return 'Discussions List';
    if (path.includes('/admin')) return 'Admin Panel';
    return path;
  };

  const trackEvent = async (
    eventType: string, 
    eventTarget: string, 
    discussionId: string | null = null,
    durationSeconds: number | null = null
  ) => {
    if (!user || !session) {
      console.log('[Analytics] No user or session:', { user: !!user, session: !!session });
      return;
    }
    
    // Skip tracking for admin user
    if (session.user?.email === 'edwardhill91@gmail.com') {
      console.log('[Analytics] Skipping admin user');
      return;
    }

    console.log('[Analytics] Tracking event:', { eventType, eventTarget, discussionId, durationSeconds, email: session.user?.email });

    try {
      // Get device info
      const deviceInfo = `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`;

      // Cap duration at 15 minutes
      const cappedDuration = durationSeconds && durationSeconds > MAX_DURATION_SECONDS 
        ? MAX_DURATION_SECONDS 
        : durationSeconds;

      // Insert analytics event
      const { data, error } = await supabase.from('analytics_events').insert({
        user_id: user.id,
        username: usernameRef.current || 'Unknown',
        event_type: eventType,
        event_target: eventTarget,
        device_info: deviceInfo,
        discussion_id: discussionId,
        duration_seconds: cappedDuration,
      });

      if (error) {
        console.error('[Analytics] Insert error:', error);
      } else {
        console.log('[Analytics] Event tracked successfully');
      }
    } catch (error) {
      console.error('[Analytics] Failed to track analytics event:', error);
    }
  };

  // Track page time when unmounting or navigating away
  const trackPageTime = async () => {
    if (!user || !session) return;
    if (session.user?.email === 'edwardhill91@gmail.com') return;

    const now = Date.now();
    const durationMs = now - entryTimeRef.current;
    const durationSeconds = Math.floor(durationMs / 1000);

    if (durationSeconds > 0) {
      const discussionId = getDiscussionId();
      const pageContext = getPageContext();
      
      await trackEvent(
        'page_time',
        pageContext,
        discussionId,
        durationSeconds
      );
    }
  };

  // Fetch username once
  useEffect(() => {
    if (!user) return;
    
    const fetchUsername = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (profile?.username) {
        usernameRef.current = profile.username;
      }
    };
    
    fetchUsername();
  }, [user]);

  // Track page time on path change
  useEffect(() => {
    if (!user || !session) return;
    if (session.user?.email === 'edwardhill91@gmail.com') return;

    // If path changed, track time on previous page
    if (lastPathRef.current !== location.pathname) {
      trackPageTime();
      entryTimeRef.current = Date.now();
      lastPathRef.current = location.pathname;
    }
  }, [location.pathname, user, session]);

  // Track page time on unmount
  useEffect(() => {
    return () => {
      trackPageTime();
    };
  }, []);

  // Track clicks on buttons, links, and tabs
  useEffect(() => {
    if (!user || !session) return;
    if (session.user?.email === 'edwardhill91@gmail.com') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const discussionId = getDiscussionId();
      const pageContext = getPageContext();
      
      // Check if click is on a button, link, or tab
      const button = target.closest('button');
      const link = target.closest('a');
      const tab = target.closest('[role="tab"]');
      
      if (button) {
        const buttonText = button.textContent?.trim() || button.getAttribute('aria-label') || 'Unknown Button';
        trackEvent('button_click', `${pageContext}: ${buttonText}`, discussionId);
      } else if (link) {
        const href = link.getAttribute('href') || 'Unknown Link';
        trackEvent('link_click', `${pageContext}: ${href}`, discussionId);
      } else if (tab) {
        const tabText = tab.textContent?.trim() || 'Unknown Tab';
        trackEvent('tab_click', `${pageContext}: ${tabText}`, discussionId);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [user, session, location]);

  return { trackEvent };
};
