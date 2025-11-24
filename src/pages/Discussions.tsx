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
import { LogOut, Plus, MessageSquare, User, Edit2, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
  religion?: string | null;
  political_view?: string | null;
  university_degree?: string | null;
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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [religion, setReligion] = useState('');
  const [politicalView, setPoliticalView] = useState('');
  const [universityDegree, setUniversityDegree] = useState('');
  const [selectedBelief, setSelectedBelief] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchProfiles();
    fetchDiscussions();
    checkAdminStatus();
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
  };

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
    setReligion(profile.religion || '');
    setPoliticalView(profile.political_view || '');
    setUniversityDegree(profile.university_degree || '');
    setIsEditBeliefsOpen(true);
  };

  const handleSaveBeliefs = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        religion: religion || null,
        political_view: politicalView || null,
        university_degree: universityDegree || null
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update beliefs');
      return;
    }

    toast.success('Beliefs updated!');
    setIsEditBeliefsOpen(false);
    fetchProfiles();
  };

  const handleBeliefClick = (beliefType: string, value: string) => {
    const beliefTag = `#${beliefType}: ${value}`;
    if (selectedBelief === beliefTag) {
      setSelectedBelief(null); // Clear filter if clicking the same belief
    } else {
      setSelectedBelief(beliefTag);
    }
  };

  // Get belief tags for a profile
  const getBeliefTags = (profile: Profile): Array<{type: string, value: string}> => {
    const tags: Array<{type: string, value: string}> = [];
    if (profile.religion) tags.push({ type: 'Religion', value: profile.religion });
    if (profile.political_view) tags.push({ type: 'Politics', value: profile.political_view });
    if (profile.university_degree) tags.push({ type: 'Education', value: profile.university_degree });
    return tags;
  };

  // Filter profiles based on selected belief
  const filteredProfiles = selectedBelief
    ? profiles.filter(profile => {
        const tags = getBeliefTags(profile);
        return tags.some(tag => `#${tag.type}: ${tag.value}` === selectedBelief);
      })
    : profiles;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">My Discussions</h1>
            <p className="text-muted-foreground mt-2">Start a discussion or continue an existing one</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsChangePasswordOpen(true)}>
              Change Password
            </Button>
            {isAdmin && (
              <Button variant="secondary" onClick={() => navigate('/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
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
                          {getBeliefTags(profile).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {getBeliefTags(profile).map((tag, index) => {
                                const tagString = `#${tag.type}: ${tag.value}`;
                                return (
                                  <Badge 
                                    key={index} 
                                    variant={selectedBelief === tagString ? "default" : "secondary"} 
                                    className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                                    onClick={() => handleBeliefClick(tag.type, tag.value)}
                                  >
                                    {tagString}
                                  </Badge>
                                );
                              })}
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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Your Beliefs</DialogTitle>
              <DialogDescription>
                Share your beliefs to help others understand your perspective
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Religion */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Religion</Label>
                <RadioGroup value={religion} onValueChange={setReligion}>
                  {[
                    'Christianity',
                    'Islam', 
                    'Judaism',
                    'Hinduism',
                    'Buddhism',
                    'Atheism',
                    'Agnosticism',
                    'Spiritual but not religious',
                    'Other',
                    'Prefer not to say'
                  ].map((option) => (
                    <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value={option} id={`religion-${option}`} />
                      <Label htmlFor={`religion-${option}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Political View */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Political View</Label>
                <RadioGroup value={politicalView} onValueChange={setPoliticalView}>
                  {[
                    'Liberal',
                    'Conservative',
                    'Moderate',
                    'Libertarian',
                    'Progressive',
                    'Socialist',
                    'Independent',
                    'Apolitical',
                    'Other',
                    'Prefer not to say'
                  ].map((option) => (
                    <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value={option} id={`political-${option}`} />
                      <Label htmlFor={`political-${option}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* University Degree */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">4-Year University Degree</Label>
                <RadioGroup value={universityDegree} onValueChange={setUniversityDegree}>
                  {[
                    'Yes - Completed',
                    'Currently enrolled',
                    'Some college',
                    'No',
                    'Prefer not to say'
                  ].map((option) => (
                    <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value={option} id={`university-${option}`} />
                      <Label htmlFor={`university-${option}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex gap-2 pt-4">
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

        {/* Change Password Dialog */}
        <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your new password below
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              {newPassword !== confirmPassword && confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (newPassword !== confirmPassword) {
                      toast.error('Passwords do not match');
                      return;
                    }
                    if (newPassword.length < 6) {
                      toast.error('Password must be at least 6 characters');
                      return;
                    }
                    
                    const { error } = await supabase.auth.updateUser({
                      password: newPassword
                    });

                    if (error) {
                      toast.error(error.message);
                      return;
                    }

                    toast.success('Password updated successfully!');
                    setIsChangePasswordOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1"
                  disabled={!newPassword || newPassword !== confirmPassword}
                >
                  Update Password
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