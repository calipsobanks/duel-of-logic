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

      // Fetch debate topic if discussionId is provided
      let topic = null;
      if (discussionId) {
        const { data: debateData } = await supabase
          .from('debates')
          .select('topic')
          .eq('id', discussionId)
          .single();
        
        topic = debateData?.topic || null;
      }

      // Insert analytics event
      const { data, error } = await supabase.from('analytics_events').insert({
        user_id: user.id,
        username: usernameRef.current || 'Unknown',
        event_type: eventType,
        event_target: eventTarget,
        device_info: deviceInfo,
        discussion_id: discussionId,
        topic: topic,
        duration_seconds: cappedDuration,
      });

      if (error) {
        console.error('[Analytics] Insert error:', error);
      } else {
        console.log('[Analytics] Event tracked successfully', { topic });
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

  // Track clicks on buttons, links, tabs, and discussion topics
  useEffect(() => {
    if (!user || !session) return;
    if (session.user?.email === 'edwardhill91@gmail.com') return;

    let lastEventTime = 0;
    const DEBOUNCE_MS = 300; // Prevent duplicate events within 300ms

    const handleInteraction = (event: MouseEvent | TouchEvent) => {
      // Debounce to prevent double-tracking on mobile (both touch and click fire)
      const now = Date.now();
      if (now - lastEventTime < DEBOUNCE_MS) {
        return;
      }
      lastEventTime = now;

      const target = event.target as HTMLElement;
      const discussionId = getDiscussionId();
      const pageContext = getPageContext();
      
      // Check if click is on a button, link, tab, or clickable discussion topic
      const button = target.closest('button');
      const link = target.closest('a');
      const tab = target.closest('[role="tab"]');
      const clickableCard = target.closest('.cursor-pointer');
      
      if (button) {
        const buttonText = button.textContent?.trim() || button.getAttribute('aria-label') || 'Unknown Button';
        trackEvent('button_click', `${pageContext}: ${buttonText}`, discussionId);
      } else if (link) {
        const href = link.getAttribute('href') || 'Unknown Link';
        let eventTarget = `${pageContext}: ${href}`;
        
        // If it's a "View Source" link, try to capture the associated claim
        if (link.textContent?.includes('View Source')) {
          // Find the closest parent card element
          const card = target.closest('.p-4, .p-6');
          if (card) {
            // Try to find the claim text (usually in a <p> tag before the source section)
            const claimElement = card.querySelector('p.text-base, p.leading-relaxed');
            const claim = claimElement?.textContent?.trim();
            if (claim && claim.length < 300) {
              eventTarget = `${pageContext}: View Source for "${claim}" | ${href}`;
            }
          }
        }
        
        trackEvent('link_click', eventTarget, discussionId);
      } else if (tab) {
        const tabText = tab.textContent?.trim() || 'Unknown Tab';
        trackEvent('tab_click', `${pageContext}: ${tabText}`, discussionId);
      } else if (clickableCard && !button && !link && !tab) {
        // Track discussion topic clicks
        const cardText = clickableCard.textContent?.trim() || '';
        if (cardText && cardText.length < 200) { // Only track if reasonable length
          trackEvent('discussion_click', `${pageContext}: ${cardText}`, discussionId);
        }
      }
    };

    // Listen to both click (desktop) and touchend (mobile) events
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchend', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchend', handleInteraction);
    };
  }, [user, session, location]);

  return { trackEvent };
};
