import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LogOut, Plus, MessageSquare } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
}

interface Debate {
  id: string;
  topic: string;
  debater1_id: string;
  debater2_id: string;
  debater1_score: number;
  debater2_score: number;
  status: string;
  created_at: string;
  profiles: Profile;
}

const Debates = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [topic, setTopic] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchProfiles();
    fetchDebates();
  }, [user, navigate]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('username', { ascending: true });

    if (error) {
      toast.error('Failed to load members');
      return;
    }

    setProfiles(data || []);
  };

  const fetchDebates = async () => {
    const { data, error } = await supabase
      .from('debates')
      .select(`
        *,
        profiles!debates_debater2_id_fkey(id, username)
      `)
      .eq('debater1_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load debates');
      return;
    }

    setDebates(data || []);
  };

  const startDebate = async () => {
    if (!selectedMember || !topic.trim()) return;

    const { data, error } = await supabase
      .from('debates')
      .insert({
        topic: topic.trim(),
        debater1_id: user?.id,
        debater2_id: selectedMember.id
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create debate');
      return;
    }

    toast.success('Debate started!');
    setIsDialogOpen(false);
    setTopic('');
    setSelectedMember(null);
    navigate(`/debate/active?id=${data.id}`);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">My Debates</h1>
            <p className="text-muted-foreground mt-2">Start a discussion or continue an existing one</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Active Debates */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Active Debates</h2>
            <div className="space-y-4">
              {debates.map((debate) => (
                <Card key={debate.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/debate/active?id=${debate.id}`)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {debate.topic}
                    </CardTitle>
                    <CardDescription>
                      With @{debate.profiles.username}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <span>Your score: {debate.debater1_score}</span>
                      <span>Their score: {debate.debater2_score}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {debates.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No active debates yet. Start one with a member!
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Members List */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Members</h2>
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">
                          @{profile.username}
                          {profile.id === user?.id && (
                            <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                          )}
                        </p>
                      </div>
                      {profile.id !== user?.id && (
                        <Dialog open={isDialogOpen && selectedMember?.id === profile.id} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (open) setSelectedMember(profile);
                          else setSelectedMember(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedMember(profile)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Start Debate
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Start a debate with @{profile.username}</DialogTitle>
                              <DialogDescription>
                                Choose a topic for your debate
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="topic">Debate Topic</Label>
                                <Input
                                  id="topic"
                                  placeholder="Enter the topic for discussion..."
                                  value={topic}
                                  onChange={(e) => setTopic(e.target.value)}
                                />
                              </div>
                              <Button onClick={startDebate} className="w-full" disabled={!topic.trim()}>
                                Start Debate
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {profiles.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No other members yet. Invite friends to join!
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Debates;