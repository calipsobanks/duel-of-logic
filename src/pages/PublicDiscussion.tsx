import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, Lock, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Discussion {
  id: string;
  topic: string;
  debater1_id: string;
  debater2_id: string;
  debater1_score: number;
  debater2_score: number;
  status: string;
  created_at: string;
}

interface Profile {
  username: string;
}

export default function PublicDiscussion() {
  const [searchParams] = useSearchParams();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [debater1, setDebater1] = useState<Profile | null>(null);
  const [debater2, setDebater2] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const discussionId = searchParams.get('id');

  useEffect(() => {
    if (!discussionId) {
      navigate('/');
      return;
    }

    fetchDiscussion();
  }, [discussionId]);

  const fetchDiscussion = async () => {
    try {
      // Fetch discussion - accessible to public
      const { data: debateData, error: debateError } = await supabase
        .from('debates')
        .select('*')
        .eq('id', discussionId)
        .is('deleted_at', null)
        .eq('status', 'active')
        .maybeSingle();

      if (debateError) throw debateError;

      if (!debateData) {
        toast.error('Discussion not found or no longer available');
        navigate('/');
        return;
      }

      setDiscussion(debateData);

      // Fetch debater profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', [debateData.debater1_id, debateData.debater2_id]);

      if (profilesError) throw profilesError;

      const d1 = profilesData?.find(p => p.id === debateData.debater1_id);
      const d2 = profilesData?.find(p => p.id === debateData.debater2_id);

      setDebater1(d1 || null);
      setDebater2(d2 || null);
    } catch (error) {
      console.error('Error fetching discussion:', error);
      toast.error('Failed to load discussion');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDiscussion = () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user is a participant
    if (discussion && (discussion.debater1_id === user.id || discussion.debater2_id === user.id)) {
      navigate(`/discussion/active?id=${discussionId}`);
    } else {
      toast.info('You are not a participant in this discussion');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-3 animate-pulse" />
            <p className="text-muted-foreground">Loading discussion...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!discussion) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-2xl space-y-4">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <Badge variant="secondary">Public Discussion</Badge>
            </div>
            <CardTitle className="text-2xl">{discussion.topic}</CardTitle>
            <CardDescription className="text-base mt-2">
              A debate between @{debater1?.username || 'Unknown'} and @{debater2?.username || 'Unknown'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div className="text-center flex-1">
                <p className="text-sm text-muted-foreground mb-1">@{debater1?.username}</p>
                <p className="text-3xl font-bold text-primary">{discussion.debater1_score}</p>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">VS</div>
              <div className="text-center flex-1">
                <p className="text-sm text-muted-foreground mb-1">@{debater2?.username}</p>
                <p className="text-3xl font-bold text-primary">{discussion.debater2_score}</p>
              </div>
            </div>

            <Card className="bg-muted/30 border-primary/20">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Sign in to join the discussion</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button 
                onClick={handleJoinDiscussion}
                className="flex-1"
              >
                {user ? 'View Discussion' : 'Sign In to Join'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
              >
                Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
