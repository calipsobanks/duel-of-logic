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
import { LogOut, Plus, MessageSquare, User, Edit2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
  beliefs?: string[] | null;
}

interface Discussion {
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

const Discussions = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [topic, setTopic] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditBeliefsOpen, setIsEditBeliefsOpen] = useState(false);
  const [beliefsInput, setBeliefsInput] = useState('');
  const [selectedBelief, setSelectedBelief] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchProfiles();
    fetchDiscussions();
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

  const fetchDiscussions = async () => {
    const { data, error } = await supabase
      .from('debates')
      .select(`
        *,
        profiles!debates_debater2_id_fkey(id, username)
      `)
      .eq('debater1_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load discussions');
      return;
    }

    setDiscussions(data || []);
  };

  const startDiscussion = async () => {
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
      toast.error('Failed to create discussion');
      return;
    }

    toast.success('Discussion started!');
    setIsDialogOpen(false);
    setTopic('');
    setSelectedMember(null);
    navigate(`/discussion/active?id=${data.id}`);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>, userId: string) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast.success('Profile picture updated!');
      fetchProfiles();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEditBeliefs = (profile: Profile) => {
    const beliefsList = profile.beliefs || [];
    setBeliefsInput(beliefsList.join(', '));
    setIsEditBeliefsOpen(true);
  };

  const handleSaveBeliefs = async () => {
    if (!user) return;

    // Parse the input - split by comma and clean up hashtags
    const beliefsArray = beliefsInput
      .split(',')
      .map(belief => {
        let cleaned = belief.trim();
        // Add # if not present
        if (cleaned && !cleaned.startsWith('#')) {
          cleaned = '#' + cleaned;
        }
        return cleaned;
      })
      .filter(belief => belief.length > 1); // Filter out empty or just '#'

    const { error } = await supabase
      .from('profiles')
      .update({ beliefs: beliefsArray })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update beliefs');
      return;
    }

    toast.success('Beliefs updated!');
    setIsEditBeliefsOpen(false);
    fetchProfiles();
  };

  const handleBeliefClick = (belief: string) => {
    if (selectedBelief === belief) {
      setSelectedBelief(null); // Clear filter if clicking the same belief
    } else {
      setSelectedBelief(belief);
    }
  };

  // Filter profiles based on selected belief
  const filteredProfiles = selectedBelief
    ? profiles.filter(profile => 
        profile.beliefs?.some(belief => belief === selectedBelief)
      )
    : profiles;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">My Discussions</h1>
            <p className="text-muted-foreground mt-2">Start a discussion or continue an existing one</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Active Discussions */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Active Discussions</h2>
            <div className="space-y-4">
              {discussions.map((discussion) => (
                <Card key={discussion.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/discussion/active?id=${discussion.id}`)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {discussion.topic}
                    </CardTitle>
                    <CardDescription>
                      With @{discussion.profiles.username}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <span>Your score: {discussion.debater1_score}</span>
                      <span>Their score: {discussion.debater2_score}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {discussions.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No active discussions yet. Start one with a member!
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Members</h2>
              {selectedBelief && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedBelief(null)}
                  className="text-xs"
                >
                  Clear Filter: {selectedBelief}
                </Button>
              )}
            </div>
            {selectedBelief && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Showing members who believe in <Badge variant="secondary">{selectedBelief}</Badge>
                </p>
              </div>
            )}
            <div className="space-y-4">
              {filteredProfiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            @{profile.username}
                            {profile.id === user?.id && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </p>
                          {profile.beliefs && profile.beliefs.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {profile.beliefs.map((belief, index) => (
                                <Badge 
                                  key={index} 
                                  variant={selectedBelief === belief ? "default" : "secondary"} 
                                  className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                                  onClick={() => handleBeliefClick(belief)}
                                >
                                  {belief}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {profile.id === user?.id && (
                        <div className="flex gap-2">
                          <label htmlFor={`avatar-upload-${profile.id}`} className="cursor-pointer">
                            <input
                              id={`avatar-upload-${profile.id}`}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleAvatarUpload(e, profile.id)}
                              className="hidden"
                            />
                            <Button variant="outline" size="sm" asChild>
                              <span>Upload Picture</span>
                            </Button>
                          </label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditBeliefs(profile)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Beliefs
                          </Button>
                        </div>
                      )}
                      {profile.id !== user?.id && (
                        <Dialog open={isDialogOpen && selectedMember?.id === profile.id} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (open) setSelectedMember(profile);
                          else setSelectedMember(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedMember(profile)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Start Discussion
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Start a discussion with @{profile.username}</DialogTitle>
                              <DialogDescription>
                                Choose a topic for your discussion
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="topic">Discussion Topic</Label>
                                <Input
                                  id="topic"
                                  placeholder="Enter the topic for discussion..."
                                  value={topic}
                                  onChange={(e) => setTopic(e.target.value)}
                                />
                              </div>
                              <Button onClick={startDiscussion} className="w-full" disabled={!topic.trim()}>
                                Start Discussion
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredProfiles.length === 0 && profiles.length > 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No members found with belief: {selectedBelief}
                  </CardContent>
                </Card>
              )}
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

        {/* Edit Beliefs Dialog */}
        <Dialog open={isEditBeliefsOpen} onOpenChange={setIsEditBeliefsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Your Beliefs</DialogTitle>
              <DialogDescription>
                Add hashtags that represent what you believe in. Separate multiple beliefs with commas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="beliefs">Your Beliefs</Label>
                <Textarea
                  id="beliefs"
                  placeholder="e.g., #ClimateAction, #Education, #Freedom"
                  value={beliefsInput}
                  onChange={(e) => setBeliefsInput(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Hashtags will be automatically added if you don't include them
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditBeliefsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveBeliefs}
                  className="flex-1"
                >
                  Save Beliefs
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Discussions;