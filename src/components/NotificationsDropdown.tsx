import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, MessageSquare, Shield, CheckCircle, AlertTriangle, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'debate_invite' | 'evidence_challenged' | 'evidence_accepted' | 'evidence_validated' | 'debate_challenge';
  title: string;
  message: string;
  debateId?: string;
  challengeId?: string;
  createdAt: string;
}

export const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { permission, requestPermission, hasNewNotification, clearNewNotification } = useNotifications();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const notifs: Notification[] = [];

      // Fetch recent debates where user was invited (debater2)
      const { data: debates } = await supabase
        .from('debates')
        .select(`
          id,
          topic,
          created_at,
          debater1:profiles!debates_debater1_id_fkey(username)
        `)
        .eq('debater2_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      debates?.forEach((debate) => {
        notifs.push({
          id: `debate-${debate.id}`,
          type: 'debate_invite',
          title: 'Discussion Invite',
          message: `@${debate.debater1?.username || 'Someone'} invited you to discuss: "${debate.topic.slice(0, 50)}${debate.topic.length > 50 ? '...' : ''}"`,
          debateId: debate.id,
          createdAt: debate.created_at,
        });
      });

      // Fetch recent evidence status changes for user's evidence
      const { data: evidence } = await supabase
        .from('evidence')
        .select(`
          id,
          claim,
          status,
          created_at,
          debate_id,
          debates!evidence_debate_id_fkey(topic)
        `)
        .eq('debater_id', user.id)
        .in('status', ['challenged', 'agreed', 'validated'])
        .order('created_at', { ascending: false })
        .limit(10);

      evidence?.forEach((ev) => {
        if (ev.status === 'challenged') {
          notifs.push({
            id: `evidence-challenged-${ev.id}`,
            type: 'evidence_challenged',
            title: 'Evidence Challenged',
            message: `Your evidence was challenged in "${ev.debates?.topic?.slice(0, 40) || 'a discussion'}..."`,
            debateId: ev.debate_id,
            createdAt: ev.created_at,
          });
        } else if (ev.status === 'agreed') {
          notifs.push({
            id: `evidence-accepted-${ev.id}`,
            type: 'evidence_accepted',
            title: 'Evidence Accepted',
            message: `Your evidence was accepted in "${ev.debates?.topic?.slice(0, 40) || 'a discussion'}..."`,
            debateId: ev.debate_id,
            createdAt: ev.created_at,
          });
        } else if (ev.status === 'validated') {
          notifs.push({
            id: `evidence-validated-${ev.id}`,
            type: 'evidence_validated',
            title: 'Evidence Validated',
            message: `Your challenged evidence was validated in "${ev.debates?.topic?.slice(0, 40) || 'a discussion'}..."`,
            debateId: ev.debate_id,
            createdAt: ev.created_at,
          });
        }
      });

      // Fetch debate challenges where user is challenged
      const { data: challenges } = await supabase
        .from('debate_challenges')
        .select(`
          id,
          topic,
          status,
          created_at,
          challenger:profiles!debate_challenges_challenger_id_fkey(username)
        `)
        .eq('challenged_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      challenges?.forEach((challenge) => {
        notifs.push({
          id: `challenge-${challenge.id}`,
          type: 'debate_challenge',
          title: 'Debate Challenge',
          message: `@${challenge.challenger?.username || 'Someone'} challenged you to debate: "${challenge.topic.slice(0, 50)}${challenge.topic.length > 50 ? '...' : ''}"`,
          challengeId: challenge.id,
          createdAt: challenge.created_at,
        });
      });

      // Sort by date
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs.slice(0, 15));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
      // Clear the new notification indicator when opening
      clearNewNotification();
    }
  }, [isOpen, user, clearNewNotification]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'debate_invite':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'debate_challenge':
        return <Swords className="h-4 w-4 text-red-500" />;
      case 'evidence_challenged':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'evidence_accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'evidence_validated':
        return <Shield className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleAcceptChallenge = async (challengeId: string, topic: string) => {
    try {
      // Create debate
      const { data: challenge } = await supabase
        .from('debate_challenges')
        .select('challenger_id, challenged_id')
        .eq('id', challengeId)
        .single();

      if (!challenge) return;

      const { data: debate, error: debateError } = await supabase
        .from('debates')
        .insert({
          debater1_id: challenge.challenger_id,
          debater2_id: challenge.challenged_id,
          topic,
          status: 'active',
        })
        .select()
        .single();

      if (debateError) throw debateError;

      // Update challenge status
      await supabase
        .from('debate_challenges')
        .update({ status: 'accepted', debate_id: debate.id })
        .eq('id', challengeId);

      toast.success('Challenge accepted!');
      navigate(`/discussion/active?id=${debate.id}`);
      setIsOpen(false);
    } catch (error) {
      console.error('Error accepting challenge:', error);
      toast.error('Failed to accept challenge');
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    try {
      await supabase
        .from('debate_challenges')
        .update({ status: 'declined' })
        .eq('id', challengeId);

      toast.success('Challenge declined');
      fetchNotifications();
    } catch (error) {
      console.error('Error declining challenge:', error);
      toast.error('Failed to decline challenge');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'debate_challenge') {
      // Don't navigate, let the Accept/Decline buttons handle it
      return;
    }
    setIsOpen(false);
    if (notification.debateId) {
      navigate(`/discussion/active?id=${notification.debateId}`);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {permission === 'granted' ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {/* Red notification badge */}
          {hasNewNotification && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {permission !== 'granted' && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={requestPermission}>
              Enable Push
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`w-full p-3 text-left ${notification.type === 'debate_challenge' ? '' : 'hover:bg-muted/50 transition-colors cursor-pointer'}`}
                >
                  <button
                    className="w-full flex gap-3 text-left"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                  {notification.type === 'debate_challenge' && notification.challengeId && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptChallenge(
                            notification.challengeId!,
                            notification.message.split(': "')[1]?.replace('"', '') || 'Debate Topic'
                          );
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeclineChallenge(notification.challengeId!);
                        }}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
