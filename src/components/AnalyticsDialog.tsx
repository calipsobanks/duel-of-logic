import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface AnalyticsEvent {
  id: string;
  username: string;
  event_type: string;
  event_target: string;
  device_info: string;
  created_at: string;
}

interface AnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AnalyticsDialog = ({ open, onOpenChange }: AnalyticsDialogProps) => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchAnalytics();
    }
  }, [open]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Analytics Dashboard</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No analytics data yet</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold text-foreground">User:</span>{' '}
                      <span className="text-muted-foreground">{event.username}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Event:</span>{' '}
                      <span className="text-muted-foreground">{event.event_type}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold text-foreground">Target:</span>{' '}
                      <span className="text-muted-foreground">{event.event_target}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Date:</span>{' '}
                      <span className="text-muted-foreground">
                        {format(new Date(event.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Time:</span>{' '}
                      <span className="text-muted-foreground">
                        {format(new Date(event.created_at), 'hh:mm:ss a')}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold text-foreground">Device:</span>{' '}
                      <span className="text-muted-foreground text-xs">{event.device_info}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
