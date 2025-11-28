import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Lightbulb, X, Check, ChevronLeft, ChevronRight, ExternalLink, Shield, Heart, Share2, Clock } from "lucide-react";
import { AddEvidenceDialog } from "@/components/discussion/AddEvidenceDialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeable } from "react-swipeable";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DiscussionData {
  id: string;
  topic: string;
  debater1_id: string;
  debater2_id: string;
  debater1_score: number;
  debater2_score: number;
  timer_expires_at: string | null;
  debater1: { username: string };
  debater2: { username: string };
}

interface Evidence {
  id: string;
  debate_id: string;
  debater_id: string;
  claim: string;
  source_url?: string | null;
  source_type?: string | null;
  status: string;
  created_at: string;
}

const ActiveDiscussion = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const discussionId = searchParams.get('id');
  const { toast } = useToast();
  const { user } = useAuth();
  const [discussion, setDiscussion] = useState<DiscussionData | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!discussionId) {
      navigate('/discussions');
      return;
    }

    loadDiscussion();
    loadEvidence();
  }, [discussionId, user, navigate]);

  useEffect(() => {
    if (!discussion?.timer_expires_at) return;

    const updateTimer = () => {
      const expiresAt = new Date(discussion.timer_expires_at!);
      const now = new Date();
      
      if (now >= expiresAt) {
        setTimeRemaining("Time's up!");
      } else {
        setTimeRemaining(formatDistanceToNow(expiresAt, { addSuffix: true }));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [discussion?.timer_expires_at]);

  const loadDiscussion = async () => {
    const { data, error } = await supabase
      .from('debates')
      .select(`
        *,
        debater1:profiles!debates_debater1_id_fkey(username),
        debater2:profiles!debates_debater2_id_fkey(username)
      `)
      .eq('id', discussionId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load discussion",
        variant: "destructive",
      });
      navigate('/discussions');
      return;
    }

    setDiscussion(data);
    setCurrentParticipant(data.debater1_id === user?.id ? 1 : 2);
    setLoading(false);
  };

  const loadEvidence = async () => {
    const { data, error } = await supabase
      .from('evidence')
      .select('*')
      .eq('debate_id', discussionId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load evidence",
        variant: "destructive",
      });
      return;
    }

    setEvidenceList(data || []);
  };

  const handleAddEvidence = async (evidenceData: { content: string; sourceUrl?: string; sourceType?: "factual" | "opinionated" }) => {
    const { error } = await supabase
      .from('evidence')
      .insert({
        debate_id: discussionId,
        debater_id: user?.id,
        claim: evidenceData.content,
        source_url: evidenceData.sourceUrl,
        source_type: evidenceData.sourceType,
        status: 'pending'
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add evidence",
        variant: "destructive",
      });
      return;
    }

    setIsAddingEvidence(false);
    loadEvidence();
    
    toast({
      title: "Evidence Added",
      description: "Waiting for both participants to review and agree.",
    });
  };

  const handleAgree = async (evidenceId: string) => {
    const evidence = evidenceList.find(e => e.id === evidenceId);
    if (!evidence) return;

    const { error } = await supabase
      .from('evidence')
      .update({ status: 'agreed' })
      .eq('id', evidenceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to agree on evidence",
        variant: "destructive",
      });
      return;
    }

    const hasSource = !!evidence.source_url;
    const basePoints = 1;
    const sourceBonus = hasSource ? 2 : 0;
    const totalPoints = basePoints + sourceBonus;

    const isDebater1 = evidence.debater_id === discussion?.debater1_id;
    const newScore = isDebater1 
      ? discussion!.debater1_score + totalPoints 
      : discussion!.debater2_score + totalPoints;

    await supabase
      .from('debates')
      .update(isDebater1 ? { debater1_score: newScore } : { debater2_score: newScore })
      .eq('id', discussionId);

    loadDiscussion();
    loadEvidence();
    moveToNextCard();

    toast({
      title: "Evidence Accepted",
      description: hasSource 
        ? `Both participants agreed on sourced evidence! +${totalPoints} points awarded.`
        : `Both participants agreed. +${totalPoints} point awarded.`,
    });
  };

  const handleValidate = async (evidenceId: string) => {
    const evidence = evidenceList.find(e => e.id === evidenceId);
    if (!evidence) return;

    const { error } = await supabase
      .from('evidence')
      .update({ status: 'validated' })
      .eq('id', evidenceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to validate evidence",
        variant: "destructive",
      });
      return;
    }

    const hasSource = !!evidence.source_url;
    const basePoints = 2;
    const sourceBonus = hasSource ? 2 : 0;
    const totalPoints = basePoints + sourceBonus;

    const isDebater1 = evidence.debater_id === discussion?.debater1_id;
    const newScore = isDebater1 
      ? discussion!.debater1_score + totalPoints 
      : discussion!.debater2_score + totalPoints;

    await supabase
      .from('debates')
      .update(isDebater1 ? { debater1_score: newScore } : { debater2_score: newScore })
      .eq('id', discussionId);

    loadDiscussion();
    loadEvidence();
    moveToNextCard();

    toast({
      title: "Evidence Validated",
      description: hasSource
        ? `Sourced evidence defended successfully! +${totalPoints} points awarded.`
        : `Evidence defended successfully! +${totalPoints} points awarded.`,
    });
  };

  const handleChallenge = async (evidenceId: string) => {
    const { error } = await supabase
      .from('evidence')
      .update({ status: 'challenged' })
      .eq('id', evidenceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to challenge evidence",
        variant: "destructive",
      });
      return;
    }

    loadEvidence();
    moveToNextCard();
    toast({
      title: "Evidence Challenged",
      description: "You can now add counter-evidence to disprove the claim.",
    });
  };

  const moveToNextCard = () => {
    if (currentCardIndex < evidenceList.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const moveToPrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const currentEvidence = evidenceList[currentCardIndex];
  const canSwipe = currentEvidence?.status === "pending" && currentEvidence?.debater_id !== user?.id;
  const canValidate = currentEvidence?.status === "challenged" && currentEvidence?.debater_id === user?.id;
  const canRespondToChallenge = currentEvidence?.status === "challenged" && currentEvidence?.debater_id !== user?.id;

  const swipeHandlers = useSwipeable({
    onSwiping: (e) => {
      if (!canSwipe) return;
      setIsSwiping(true);
      setSwipeOffset(e.deltaX);
    },
    onSwipedRight: () => {
      if (!canSwipe || !currentEvidence) return;
      if (swipeOffset > 100) {
        handleAgree(currentEvidence.id);
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onSwipedLeft: () => {
      if (!canSwipe || !currentEvidence) return;
      if (swipeOffset < -100) {
        handleChallenge(currentEvidence.id);
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onTouchEndOrOnMouseUp: () => {
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    trackMouse: true,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  if (loading || !discussion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/20 to-background">
        <div className="animate-pulse text-lg">Loading discussion...</div>
      </div>
    );
  }

  const lastEvidence = evidenceList[evidenceList.length - 1];
  const canAddEvidence = evidenceList.length === 0 || 
    lastEvidence?.status === "agreed" || 
    lastEvidence?.status === "validated" ||
    (lastEvidence?.status === "challenged" && lastEvidence?.debater_id !== user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background flex flex-col">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/discussions')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {/* Score Display & Timer */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{discussion.debater1.username}</div>
                <div className="text-xl font-bold text-primary">{discussion.debater1_score}</div>
              </div>
              <div className="text-lg font-bold text-muted-foreground">vs</div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{discussion.debater2.username}</div>
                <div className="text-xl font-bold text-destructive">{discussion.debater2_score}</div>
              </div>
            </div>
            {timeRemaining && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{timeRemaining}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                const shareUrl = `${window.location.origin}/discussion/public?id=${discussionId}`;
                
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: discussion.topic,
                      text: `Join this debate: ${discussion.topic}`,
                      url: shareUrl,
                    });
                  } catch (err) {
                    if ((err as Error).name !== 'AbortError') {
                      console.error('Error sharing:', err);
                    }
                  }
                } else {
                  await navigator.clipboard.writeText(shareUrl);
                  toast({
                    title: "Link Copied!",
                    description: "Share this discussion with others",
                  });
                }
              }}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Lightbulb className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Debate Tips
                  </DialogTitle>
                  <DialogDescription>
                    Strengthen your arguments with these techniques.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-sm mb-1">🔽 Deductive</h4>
                    <p className="text-xs text-muted-foreground">
                      General → Specific: "All mammals are warm-blooded. Dogs are mammals. Therefore, dogs are warm-blooded."
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-sm mb-1">🔼 Inductive</h4>
                    <p className="text-xs text-muted-foreground">
                      Specific → General: "Every swan I've seen is white. Therefore, all swans are probably white."
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
        {evidenceList.length === 0 ? (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Plus className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No evidence yet</p>
            <Button onClick={() => setIsAddingEvidence(true)}>
              Add First Evidence
            </Button>
          </div>
        ) : (
          <>
            {/* Card Navigation */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={moveToPrevCard}
                disabled={currentCardIndex === 0}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentCardIndex + 1} / {evidenceList.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={moveToNextCard}
                disabled={currentCardIndex === evidenceList.length - 1}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Swipeable Card */}
            <div
              {...(canSwipe ? swipeHandlers : {})}
              className="relative w-full max-w-sm"
              style={{
                transform: canSwipe ? `translateX(${swipeOffset * 0.5}px) rotate(${swipeOffset * 0.02}deg)` : 'none',
                transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              {/* Swipe Indicators */}
              {canSwipe && isSwiping && (
                <>
                  <div 
                    className="absolute -left-2 top-1/2 -translate-y-1/2 bg-destructive text-destructive-foreground rounded-full p-3 z-10 transition-opacity"
                    style={{ opacity: swipeOffset < -30 ? Math.min(Math.abs(swipeOffset) / 100, 1) : 0 }}
                  >
                    <X className="w-8 h-8" />
                  </div>
                  <div 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 bg-green-500 text-white rounded-full p-3 z-10 transition-opacity"
                    style={{ opacity: swipeOffset > 30 ? Math.min(swipeOffset / 100, 1) : 0 }}
                  >
                    <Check className="w-8 h-8" />
                  </div>
                </>
              )}

              {/* Evidence Card */}
              <div className={`bg-card rounded-3xl shadow-2xl overflow-hidden border-2 ${
                canSwipe ? 'cursor-grab active:cursor-grabbing border-primary/20' : 'border-border'
              }`}>
                {/* Premise/Topic */}
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-3 border-b border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Premise</p>
                  <p className="text-base font-bold text-foreground leading-snug">
                    {discussion.topic}
                  </p>
                </div>

                {/* Card Header */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{currentCardIndex + 1}
                      </Badge>
                      <span className="text-sm font-medium">
                        {currentEvidence?.debater_id === discussion.debater1_id 
                          ? discussion.debater1.username 
                          : discussion.debater2.username}
                      </span>
                    </div>
                    <Badge variant={
                      currentEvidence?.status === "agreed" ? "default" :
                      currentEvidence?.status === "validated" ? "default" :
                      currentEvidence?.status === "challenged" ? "destructive" :
                      "secondary"
                    } className="text-xs">
                      {currentEvidence?.status}
                    </Badge>
                  </div>
                  {currentEvidence?.source_type && (
                    <Badge 
                      variant={currentEvidence.source_type === "factual" ? "default" : "secondary"}
                      className="mt-2 text-xs"
                    >
                      {currentEvidence.source_type === "factual" ? "📊 Factual" : "💭 Opinion"}
                    </Badge>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-6 min-h-[200px] flex flex-col justify-center">
                  <p className="text-lg leading-relaxed text-foreground">
                    {currentEvidence?.claim}
                  </p>
                  
                  {currentEvidence?.source_url && (
                    <a 
                      href={currentEvidence.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Source
                    </a>
                  )}
                </div>

                {/* Swipe Hint */}
                {canSwipe && !isSwiping && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full py-2 px-4">
                      <X className="w-3 h-3 text-destructive" />
                      <span>Swipe to respond</span>
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-lg border-t safe-area-inset-bottom">
        <div className="flex items-center justify-center gap-4 p-4">
          {canSwipe && currentEvidence && (
            <>
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-lg"
                onClick={() => handleChallenge(currentEvidence.id)}
              >
                <X className="w-8 h-8" />
              </Button>
              
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-all shadow-lg"
                onClick={() => handleAgree(currentEvidence.id)}
              >
                <Heart className="w-8 h-8 fill-current" />
              </Button>
            </>
          )}

          {canValidate && currentEvidence && (
            <>
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-lg"
                onClick={() => setIsAddingEvidence(true)}
              >
                <X className="w-8 h-8" />
              </Button>
              
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-all shadow-lg"
                onClick={() => handleValidate(currentEvidence.id)}
              >
                <Heart className="w-8 h-8 fill-current" />
              </Button>
            </>
          )}

          {canRespondToChallenge && currentEvidence && (
            <>
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-lg"
                onClick={() => setIsAddingEvidence(true)}
              >
                <X className="w-8 h-8" />
              </Button>
              
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-all shadow-lg"
                onClick={() => handleAgree(currentEvidence.id)}
              >
                <Heart className="w-8 h-8 fill-current" />
              </Button>
            </>
          )}

          {!canSwipe && !canValidate && !canRespondToChallenge && canAddEvidence && (
            <Button
              size="lg"
              className="h-14 px-8 rounded-full shadow-lg"
              onClick={() => setIsAddingEvidence(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Evidence
            </Button>
          )}

          {!canSwipe && !canValidate && !canRespondToChallenge && !canAddEvidence && (
            <p className="text-sm text-muted-foreground text-center">
              Waiting for opponent's response...
            </p>
          )}
        </div>
      </div>

      {/* Add Evidence Dialog */}
      <AddEvidenceDialog
        open={isAddingEvidence}
        onOpenChange={setIsAddingEvidence}
        onSubmit={handleAddEvidence}
        currentParticipantName={currentParticipant === 1 ? discussion.debater1.username : discussion.debater2.username}
      />
    </div>
  );
};

export default ActiveDiscussion;
