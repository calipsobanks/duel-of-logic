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
import { LogOut, Plus, MessageSquare, User, Edit2, Shield, Trophy, Home, Users, Bell, BellOff, Trash2, Share2, ExternalLink, Heart, MessagesSquare, Award, BookOpen, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { getRankForPoints } from '@/lib/ranks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { useNotifications } from '@/hooks/useNotifications';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ControversialTopics } from '@/components/ControversialTopics';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useAnalytics } from '@/hooks/useAnalytics';
interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
  religion?: string | null;
  political_view?: string | null;
  university_degree?: string | null;
  phone_number?: string | null;
  about_me?: string | null;
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
  debater1: {
    id: string;
    username: string;
  } | null;
  debater2: {
    id: string;
    username: string;
  } | null;
}
interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar_url?: string | null;
  totalPoints: number;
  debatesCount: number;
}
type TabType = 'home' | 'leaderboard' | 'members' | 'discussion_room' | 'profile';
const Discussions = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [allDiscussions, setAllDiscussions] = useState<Discussion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [viewMemberProfile, setViewMemberProfile] = useState<Profile | null>(null);
  const [topic, setTopic] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMemberProfileOpen, setIsMemberProfileOpen] = useState(false);
  const [isEditBeliefsOpen, setIsEditBeliefsOpen] = useState(false);
  const [isEditPhoneOpen, setIsEditPhoneOpen] = useState(false);
  const [isEditAboutMeOpen, setIsEditAboutMeOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [religion, setReligion] = useState('');
  const [politicalView, setPoliticalView] = useState('');
  const [universityDegree, setUniversityDegree] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [selectedBelief, setSelectedBelief] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const {
    user,
    session,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const {
    permission,
    requestPermission
  } = useNotifications();
  
  // Initialize analytics tracking
  useAnalytics();
  const currentUserProfile = profiles.find(p => p.id === user?.id);
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfiles();
    fetchDiscussions();
    fetchAllDiscussions();
    checkAdminStatus();

    // Listen for tab change events from ControversialTopics component
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail as TabType);
    };
    window.addEventListener('change-tab', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('change-tab', handleTabChange as EventListener);
    };
  }, [user, navigate]);
  const checkAdminStatus = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    setIsAdmin(!!data);
  };
  const fetchProfiles = async () => {
    const {
      data,
      error
    } = await supabase.from('profiles').select('*').order('username', {
      ascending: true
    });
    if (error) {
      toast.error('Failed to load members');
      return;
    }
    setProfiles(data || []);
    if (data && data.length > 0) {
      await fetchLeaderboardWithProfiles(data);
    }
  };
  const fetchLeaderboardWithProfiles = async (profilesData: Profile[]) => {
    const {
      data: debates,
      error
    } = await supabase.from('debates').select('*');
    if (error) {
      toast.error('Failed to load leaderboard');
      return;
    }
    const scoreMap = new Map<string, {
      totalPoints: number;
      debatesCount: number;
    }>();
    debates?.forEach(debate => {
      const debater1Stats = scoreMap.get(debate.debater1_id) || {
        totalPoints: 0,
        debatesCount: 0
      };
      debater1Stats.totalPoints += debate.debater1_score;
      debater1Stats.debatesCount += 1;
      scoreMap.set(debate.debater1_id, debater1Stats);
      const debater2Stats = scoreMap.get(debate.debater2_id) || {
        totalPoints: 0,
        debatesCount: 0
      };
      debater2Stats.totalPoints += debate.debater2_score;
      debater2Stats.debatesCount += 1;
      scoreMap.set(debate.debater2_id, debater2Stats);
    });
    const leaderboardData: LeaderboardEntry[] = profilesData.map(profile => {
      const stats = scoreMap.get(profile.id) || {
        totalPoints: 0,
        debatesCount: 0
      };
      return {
        userId: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        totalPoints: stats.totalPoints,
        debatesCount: stats.debatesCount
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
    setLeaderboard(leaderboardData);
  };
  const fetchDiscussions = async () => {
    const {
      data,
      error
    } = await supabase.from('debates').select(`
        *,
        debater1:profiles!debates_debater1_id_fkey(id, username),
        debater2:profiles!debates_debater2_id_fkey(id, username)
      `).or(`debater1_id.eq.${user?.id},debater2_id.eq.${user?.id}`).is('deleted_at', null).order('created_at', {
      ascending: false
    });
    if (error) {
      toast.error('Failed to load discussions');
      return;
    }
    setDiscussions(data || []);
  };
  const fetchAllDiscussions = async () => {
    const {
      data,
      error
    } = await supabase.from('debates').select(`
        *,
        debater1:profiles!debates_debater1_id_fkey(id, username),
        debater2:profiles!debates_debater2_id_fkey(id, username)
      `).is('deleted_at', null).order('created_at', {
      ascending: false
    });
    if (error) {
      console.error('Failed to load all discussions:', error);
      return;
    }
    setAllDiscussions(data || []);
  };
  const deleteDiscussion = async (discussionId: string) => {
    const {
      error
    } = await supabase.from('debates').update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id
    }).eq('id', discussionId);
    if (error) {
      toast.error('Failed to delete discussion');
      return;
    }
    toast.success('Discussion deleted (points preserved)');
    fetchDiscussions();
    fetchAllDiscussions();
  };
  const startDiscussion = async () => {
    if (!selectedMember || !topic.trim()) return;
    const {
      data,
      error
    } = await supabase.from('debates').insert({
      topic: topic.trim(),
      debater1_id: user?.id,
      debater2_id: selectedMember.id,
      timer_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }).select().single();
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
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(fileName, file, {
        upsert: true
      });
      if (uploadError) throw uploadError;
      const {
        data
      } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const {
        error: updateError
      } = await supabase.from('profiles').update({
        avatar_url: data.publicUrl
      }).eq('id', userId);
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
    setPhoneNumber(profile.phone_number || '');
    setIsEditBeliefsOpen(true);
  };
  const handleSaveBeliefs = async () => {
    if (!user) return;
    const {
      error
    } = await supabase.from('profiles').update({
      religion: religion || null,
      political_view: politicalView || null,
      university_degree: universityDegree || null
    }).eq('id', user.id);
    if (error) {
      toast.error('Failed to update beliefs');
      return;
    }
    toast.success('Beliefs updated!');
    setIsEditBeliefsOpen(false);
    fetchProfiles();
  };
  const handleSavePhoneNumber = async () => {
    if (!user) return;
    const {
      error
    } = await supabase.from('profiles').update({
      phone_number: phoneNumber || null
    }).eq('id', user.id);
    if (error) {
      toast.error('Failed to update phone number');
      return;
    }
    toast.success('Phone number updated!');
    setIsEditPhoneOpen(false);
    fetchProfiles();
  };

  const handleSaveAboutMe = async () => {
    if (!user) return;
    const {
      error
    } = await supabase.from('profiles').update({
      about_me: aboutMe || null
    }).eq('id', user.id);
    if (error) {
      toast.error('Failed to update about me');
      return;
    }
    toast.success('About me updated!');
    setIsEditAboutMeOpen(false);
    fetchProfiles();
  };
  const handleBeliefClick = (beliefType: string, value: string) => {
    const beliefTag = `#${beliefType}: ${value}`;
    if (selectedBelief === beliefTag) {
      setSelectedBelief(null);
    } else {
      setSelectedBelief(beliefTag);
    }
  };
  const getBeliefTags = (profile: Profile): Array<{
    type: string;
    value: string;
  }> => {
    const tags: Array<{
      type: string;
      value: string;
    }> = [];
    if (profile.religion) tags.push({
      type: 'Religion',
      value: profile.religion
    });
    if (profile.political_view) tags.push({
      type: 'Politics',
      value: profile.political_view
    });
    if (profile.university_degree) tags.push({
      type: 'Education',
      value: profile.university_degree
    });
    return tags;
  };
  const filteredProfiles = selectedBelief ? profiles.filter(profile => {
    const tags = getBeliefTags(profile);
    return tags.some(tag => `#${tag.type}: ${tag.value}` === selectedBelief);
  }) : profiles;
  const currentUserLeaderboardEntry = leaderboard.find(e => e.userId === user?.id);
  const currentUserRank = leaderboard.findIndex(e => e.userId === user?.id) + 1;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">
            {activeTab === 'home' && 'Discussions'}
            {activeTab === 'leaderboard' && 'Leaderboard'}
            {activeTab === 'members' && 'Members'}
            {activeTab === 'discussion_room' && 'Discussion Room'}
            {activeTab === 'profile' && 'Profile'}
          </h1>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            {isAdmin && <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <Shield className="h-5 w-5" />
              </Button>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Home Tab - Active Discussions */}
        {activeTab === 'home' && <div className="space-y-4">
            {discussions.map(discussion => {
          const isDebater1 = discussion.debater1_id === user?.id;
          const opponent = isDebater1 ? discussion.debater2 : discussion.debater1;
          const yourScore = isDebater1 ? discussion.debater1_score : discussion.debater2_score;
          const theirScore = isDebater1 ? discussion.debater2_score : discussion.debater1_score;
          return <Card key={discussion.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex items-start gap-2 text-sm cursor-pointer flex-1" onClick={() => navigate(`/discussion/active?id=${discussion.id}`)}>
                        <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{discussion.topic}</span>
                      </CardTitle>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => {
                    e.stopPropagation();
                    const shareUrl = `${window.location.origin}/discussion/public?id=${discussion.id}`;
                    if (navigator.share) {
                      navigator.share({
                        title: discussion.topic,
                        text: `Check out this debate: ${discussion.topic}`,
                        url: shareUrl
                      }).catch(() => {
                        navigator.clipboard.writeText(shareUrl);
                        toast.success('Link copied to clipboard!');
                      });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success('Link copied to clipboard!');
                    }
                  }}>
                          <Share2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="mx-4 max-w-sm">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Discussion?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the discussion from your list. All points earned will be preserved on the leaderboard.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteDiscussion(discussion.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <CardDescription className="text-xs cursor-pointer" onClick={() => navigate(`/discussion/active?id=${discussion.id}`)}>
                      vs @{opponent?.username || 'Unknown'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 cursor-pointer" onClick={() => navigate(`/discussion/active?id=${discussion.id}`)}>
                    <div className="flex justify-between text-xs">
                      <span className="text-primary font-medium">You: {yourScore}</span>
                      <span className="text-muted-foreground">Them: {theirScore}</span>
                    </div>
                  </CardContent>
                </Card>;
        })}
            {discussions.length === 0 && <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">No discussions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Go to Members to start one!</p>
                </CardContent>
              </Card>}
            
            {/* Controversial Topics Section */}
            <div className="pt-4">
              <ControversialTopics />
            </div>
          </div>}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && <div className="space-y-3">
            {leaderboard.map((entry, index) => {
          const rank = getRankForPoints(entry.totalPoints);
          return <div key={entry.userId} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${entry.userId === user?.id ? 'bg-primary/10 border-primary' : 'bg-card'}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`text-lg font-bold min-w-[1.5rem] text-center flex-shrink-0 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={entry.avatar_url || undefined} alt={entry.username} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">
                        @{entry.username}
                        {entry.userId === user?.id && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs">{rank.icon}</span>
                      <p className={`text-xs font-medium ${rank.color}`}>
                        {rank.name}
                      </p>
                      <span className="text-xs text-muted-foreground">• {entry.debatesCount} debates</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-primary">{entry.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </div>;
        })}
            {leaderboard.length === 0 && <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">No rankings yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start debating to earn points!</p>
                </CardContent>
              </Card>}
          </div>}

        {/* Members Tab */}
        {activeTab === 'members' && <div className="space-y-3">
            {selectedBelief && <div className="flex items-center justify-between p-2 bg-muted rounded-lg mb-3">
                <p className="text-xs text-muted-foreground">
                  Filter: <Badge variant="secondary" className="text-xs">{selectedBelief}</Badge>
                </p>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedBelief(null)}>
                  Clear
                </Button>
              </div>}
            {filteredProfiles.filter(p => p.id !== user?.id).map(profile => <Card key={profile.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                setViewMemberProfile(profile);
                setIsMemberProfileOpen(true);
              }}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">@{profile.username}</p>
                        {getBeliefTags(profile).length > 0 && <div className="flex flex-wrap gap-1 mt-1">
                            {getBeliefTags(profile).slice(0, 2).map((tag, index) => <Badge key={index} variant={selectedBelief === `#${tag.type}: ${tag.value}` ? "default" : "secondary"} className="text-[10px] cursor-pointer" onClick={e => {
                      e.stopPropagation();
                      handleBeliefClick(tag.type, tag.value);
                    }}>
                                {tag.value}
                              </Badge>)}
                          </div>}
                      </div>
                    </div>
                    <Dialog open={isDialogOpen && selectedMember?.id === profile.id} onOpenChange={open => {
                setIsDialogOpen(open);
                if (open) setSelectedMember(profile);else setSelectedMember(null);
              }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="flex-shrink-0" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(profile);
                        }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="mx-4 max-w-sm">
                        <DialogHeader>
                          <DialogTitle className="text-base">Debate @{profile.username}</DialogTitle>
                          <DialogDescription className="text-xs">
                            What topic do you want to discuss?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="topic" className="text-sm">Topic</Label>
                            <Input id="topic" placeholder="Enter your debate topic..." value={topic} onChange={e => setTopic(e.target.value)} />
                          </div>
                          <Button onClick={startDiscussion} className="w-full" disabled={!topic.trim()}>
                            Start Discussion
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>)}
            {filteredProfiles.filter(p => p.id !== user?.id).length === 0 && <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">No members found</p>
                </CardContent>
              </Card>}
          </div>}

        {/* Discussion Room Tab - Hot Topics & All Discussions */}
        {activeTab === 'discussion_room' && <div className="space-y-6">
            {/* Hot Topics Section */}
            <ControversialTopics />
            
            {/* All Member Discussions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">All Member Discussions</h2>
              </div>
              
              {allDiscussions.length === 0 ? <Card>
                  <CardContent className="pt-8 pb-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">No discussions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Be the first to start one!</p>
                  </CardContent>
                </Card> : allDiscussions.map(discussion => {
            const isParticipant = discussion.debater1_id === user?.id || discussion.debater2_id === user?.id;
            return <Card key={discussion.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/discussion/active?id=${discussion.id}`)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="flex items-start gap-2 text-sm flex-1">
                            <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{discussion.topic}</span>
                          </CardTitle>
                          {isParticipant && <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                              You
                            </Badge>}
                        </div>
                        <CardDescription className="text-xs">
                          @{discussion.debater1?.username || 'Unknown'} vs @{discussion.debater2?.username || 'Unknown'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {discussion.debater1?.username}: {discussion.debater1_score}
                          </span>
                          <span className="text-muted-foreground">
                            {discussion.debater2?.username}: {discussion.debater2_score}
                          </span>
                        </div>
                      </CardContent>
                    </Card>;
          })}
            </div>
          </div>}

        {/* Profile Tab */}
        {activeTab === 'profile' && currentUserProfile && <div className="space-y-4">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={currentUserProfile.avatar_url || undefined} alt={currentUserProfile.username} />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">@{currentUserProfile.username}</h2>
                  
                  {/* Stats */}
                  <div className="flex gap-6 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{currentUserLeaderboardEntry?.totalPoints || 0}</p>
                      <p className="text-xs text-muted-foreground">Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{currentUserLeaderboardEntry?.debatesCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Debates</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">#{currentUserRank || '-'}</p>
                      <p className="text-xs text-muted-foreground">Rank</p>
                    </div>
                  </div>

                  {/* Beliefs */}
                  {getBeliefTags(currentUserProfile).length > 0 && <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {getBeliefTags(currentUserProfile).map((tag, index) => <Badge key={index} variant="secondary">
                          {tag.type}: {tag.value}
                        </Badge>)}
                    </div>}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 mt-6 w-full">
                    {/* Notifications */}
                    <Button variant={permission === 'granted' ? 'secondary' : 'outline'} onClick={requestPermission} disabled={permission === 'granted'} className="w-full">
                      {permission === 'granted' ? <>
                          <Bell className="h-4 w-4 mr-2" />
                          Notifications Enabled
                        </> : <>
                          <BellOff className="h-4 w-4 mr-2" />
                          Enable Notifications
                        </>}
                    </Button>
                    <Button variant="outline" onClick={() => setIsOnboardingOpen(true)} className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      View Tutorial
                    </Button>
                    <label htmlFor="avatar-upload" className="cursor-pointer w-full">
                      <input id="avatar-upload" type="file" accept="image/*" onChange={e => handleAvatarUpload(e, currentUserProfile.id)} className="hidden" />
                      <Button variant="outline" className="w-full" asChild>
                        <span>Change Photo</span>
                      </Button>
                    </label>
                    <Button variant="outline" onClick={() => {
                  setPhoneNumber(currentUserProfile.phone_number || '');
                  setIsEditPhoneOpen(true);
                }} className="w-full">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Phone Number
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setAboutMe(currentUserProfile.about_me || '');
                      setIsEditAboutMeOpen(true);
                    }} className="w-full">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit About Me
                    </Button>
                    <Button variant="outline" onClick={() => handleEditBeliefs(currentUserProfile)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Beliefs
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/support')} className="w-full border-gold/50 hover:border-gold hover:bg-gold/10 text-gold hover:text-gold">
                      <Heart className="h-4 w-4 mr-2 fill-gold" />
                      Support This App
                    </Button>
                    <Button variant="destructive" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </CardContent>
              <div className="px-6 pb-4 text-center">
                <p className="text-xs text-muted-foreground">v0.6</p>
              </div>
            </Card>
          </div>}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t safe-area-inset-bottom z-50">
        <div className="flex items-center justify-around py-2">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Home className={`h-5 w-5 ${activeTab === 'home' ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] mt-1">Home</span>
          </button>
          <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${activeTab === 'leaderboard' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Trophy className={`h-5 w-5 ${activeTab === 'leaderboard' ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] mt-1">Ranks</span>
          </button>
          <button onClick={() => setActiveTab('members')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${activeTab === 'members' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Users className={`h-5 w-5 ${activeTab === 'members' ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] mt-1">Members</span>
          </button>
          <button onClick={() => setActiveTab('discussion_room')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${activeTab === 'discussion_room' ? 'text-primary' : 'text-muted-foreground'}`}>
            <MessagesSquare className={`h-5 w-5 ${activeTab === 'discussion_room' ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] mt-1">Discussions</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`}>
            <User className={`h-5 w-5 ${activeTab === 'profile' ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] mt-1">Profile</span>
          </button>
        </div>
      </nav>

      {/* Edit Beliefs Dialog */}
      <Dialog open={isEditBeliefsOpen} onOpenChange={setIsEditBeliefsOpen}>
        <DialogContent className="max-w-sm mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Your Beliefs</DialogTitle>
            <DialogDescription className="text-xs">
              Share your beliefs to help others understand your perspective
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Religion */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Religion</Label>
              <RadioGroup value={religion} onValueChange={setReligion} className="grid grid-cols-2 gap-2">
                {['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Atheism', 'Agnosticism', 'Other'].map(option => <div key={option} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value={option} id={`religion-${option}`} />
                    <Label htmlFor={`religion-${option}`} className="text-xs cursor-pointer">{option}</Label>
                  </div>)}
              </RadioGroup>
            </div>

            {/* Political View */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Political View</Label>
              <RadioGroup value={politicalView} onValueChange={setPoliticalView} className="grid grid-cols-2 gap-2">
                {['Liberal', 'Conservative', 'Moderate', 'Libertarian', 'Progressive', 'Socialist', 'Independent', 'Other'].map(option => <div key={option} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value={option} id={`political-${option}`} />
                    <Label htmlFor={`political-${option}`} className="text-xs cursor-pointer">{option}</Label>
                  </div>)}
              </RadioGroup>
            </div>

            {/* University Degree */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Education</Label>
              <RadioGroup value={universityDegree} onValueChange={setUniversityDegree} className="space-y-2">
                {['Yes - Completed', 'Currently enrolled', 'Some college', 'No'].map(option => <div key={option} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value={option} id={`university-${option}`} />
                    <Label htmlFor={`university-${option}`} className="text-xs cursor-pointer">{option}</Label>
                  </div>)}
              </RadioGroup>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditBeliefsOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveBeliefs} className="flex-1">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Phone Number Dialog */}
      <Dialog open={isEditPhoneOpen} onOpenChange={setIsEditPhoneOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Edit Phone Number</DialogTitle>
            <DialogDescription className="text-xs">
              Get notified when someone challenges or responds to you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="phone-number-edit" className="text-sm font-semibold">Phone Number</Label>
              <Input id="phone-number-edit" type="tel" placeholder="+1234567890" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +1 for US)
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditPhoneOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSavePhoneNumber} className="flex-1">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit About Me Dialog */}
      <Dialog open={isEditAboutMeOpen} onOpenChange={setIsEditAboutMeOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Edit About Me</DialogTitle>
            <DialogDescription className="text-xs">
              Tell others about yourself
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="about-me-edit" className="text-sm font-semibold">About Me</Label>
              <Textarea 
                id="about-me-edit" 
                placeholder="Share something about yourself..."
                value={aboutMe}
                onChange={e => setAboutMe(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditAboutMeOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveAboutMe} className="flex-1">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Member Profile Dialog */}
      <Dialog open={isMemberProfileOpen} onOpenChange={setIsMemberProfileOpen}>
        <DialogContent className="max-w-sm mx-4 max-h-[80vh] overflow-y-auto">
          {viewMemberProfile && (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-3">
                    <AvatarImage src={viewMemberProfile.avatar_url || undefined} alt={viewMemberProfile.username} />
                    <AvatarFallback>
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <DialogTitle className="text-lg">@{viewMemberProfile.username}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* About Me Section */}
                {viewMemberProfile.about_me && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">About</Label>
                    <p className="text-sm text-muted-foreground">{viewMemberProfile.about_me}</p>
                  </div>
                )}

                {/* Beliefs Section */}
                {getBeliefTags(viewMemberProfile).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Beliefs</Label>
                    <div className="flex flex-wrap gap-2">
                      {getBeliefTags(viewMemberProfile).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag.type}: {tag.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => {
                    setIsMemberProfileOpen(false);
                    setSelectedMember(viewMemberProfile);
                    setIsDialogOpen(true);
                  }} 
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start Debate
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Onboarding Modal */}
      {user && (
        <OnboardingModal 
          open={isOnboardingOpen}
          userId={user.id}
          onComplete={() => setIsOnboardingOpen(false)}
        />
      )}
    </div>
  );
};

export default Discussions;