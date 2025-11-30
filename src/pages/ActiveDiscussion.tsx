import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Lightbulb, Share2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddEvidenceDialog } from "@/components/discussion/AddEvidenceDialog";
import { TimelineEvidenceCard } from "@/components/discussion/TimelineEvidenceCard";
import { VsIntroAnimation } from "@/components/discussion/VsIntroAnimation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useReaction } from "@/contexts/ReactionContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  source_rating?: number | null;
  source_reasoning?: string | null;
  source_confidence?: string | null;
  content_analyzed?: boolean | null;
  source_warning?: string | null;
  claim_evaluation?: string | null;
  suggested_correction?: string | null;
  quote_example?: string | null;
  status: string;
  created_at: string;
}

const ActiveDiscussion = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const discussionId = searchParams.get('id');
  const { toast } = useToast();
  const { user } = useAuth();
  const { showReaction } = useReaction();
  useAnalytics();
  const [discussion, setDiscussion] = useState<DiscussionData | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [isReratingSource, setIsReratingSource] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [updatingSourceForId, setUpdatingSourceForId] = useState<string | null>(null);
  const [showVsIntro, setShowVsIntro] = useState(false);
  const hasShownIntroRef = useRef(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showAdmitDefeatDialog, setShowAdmitDefeatDialog] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<string>("");
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [evaluationError, setEvaluationError] = useState(false);
  const [evaluationHistory, setEvaluationHistory] = useState<Array<{ id: string; evaluation: string; evidence_count: number; created_at: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);

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
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining("00:00:00");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
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

    // Check if user is a participant
    const isParticipant = data.debater1_id === user?.id || data.debater2_id === user?.id;
    setIsSpectator(!isParticipant);

    setDiscussion(data);
    setCurrentParticipant(data.debater1_id === user?.id ? 1 : 2);
    setLoading(false);
    
    // Only show VS intro once per session and only if discussion just started
    const sessionKey = `vs-intro-shown-${discussionId}`;
    const hasShownInSession = sessionStorage.getItem(sessionKey);
    
    console.log('VS Intro Check:', {
      hasShownInSession: !!hasShownInSession,
      hasShownIntroRef: hasShownIntroRef.current,
      discussionId
    });
    
    if (!hasShownInSession && !hasShownIntroRef.current) {
      // Check if this is a new discussion (no evidence yet)
      const { count } = await supabase
        .from('evidence')
        .select('*', { count: 'exact', head: true })
        .eq('debate_id', discussionId);
      
      console.log('VS Intro: Evidence count:', count);
      
      if (count === 0) {
        console.log('VS Intro: Showing animation!');
        setShowVsIntro(true);
        hasShownIntroRef.current = true;
        sessionStorage.setItem(sessionKey, 'true');
      } else {
        console.log('VS Intro: Not showing - discussion has evidence');
      }
    } else {
      console.log('VS Intro: Not showing - already shown in session');
    }
  };

  const loadEvidence = async () => {
    const { data, error } = await supabase
      .from('evidence')
      .select('*')
      .eq('debate_id', discussionId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load evidence",
        variant: "destructive",
      });
      return;
    }

    setEvidenceList(data || []);
    
    // Load AI evaluation if there's evidence
    if (data && data.length > 0 && discussion) {
      loadAiEvaluation(data);
    }
    
    // Load evaluation history
    loadEvaluationHistory();
  };

  const loadEvaluationHistory = async () => {
    const { data, error } = await supabase
      .from('debate_evaluations')
      .select('*')
      .eq('debate_id', discussionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load evaluation history:', error);
    } else {
      setEvaluationHistory(data || []);
    }
  };

  const loadAiEvaluation = async (evidence: Evidence[]) => {
    if (!discussion || evidence.length === 0) return;
    
    setIsLoadingEvaluation(true);
    setEvaluationError(false);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-debate', {
        body: {
          debateId: discussionId,
          topic: discussion.topic,
          debater1Name: discussion.debater1.username,
          debater2Name: discussion.debater2.username,
          debater1Id: discussion.debater1_id,
          debater2Id: discussion.debater2_id,
          evidence: evidence.map(e => ({
            debater_id: e.debater_id,
            claim: e.claim,
            status: e.status
          }))
        }
      });

      if (error) {
        console.error('Failed to load AI evaluation:', error);
        setEvaluationError(true);
        toast({
          title: "Analysis Failed",
          description: "Could not analyze debate. Click retry to try again.",
          variant: "destructive",
        });
      } else if (data?.evaluation) {
        setAiEvaluation(data.evaluation);
        setEvaluationError(false);
        // Reload history to include the new evaluation
        setTimeout(() => loadEvaluationHistory(), 1000);
      } else {
        console.error('Empty evaluation received');
        setEvaluationError(true);
      }
    } catch (error) {
      console.error('Error loading AI evaluation:', error);
      setEvaluationError(true);
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  const handleAddEvidence = async (evidenceData: { content: string; sourceUrl?: string; sourceType?: "factual" | "opinionated" }) => {
    // Verify user is still a participant
    if (!discussion || (discussion.debater1_id !== user?.id && discussion.debater2_id !== user?.id)) {
      toast({
        title: "Access Denied",
        description: "You are not a participant in this debate.",
        variant: "destructive",
      });
      return;
    }

    // Check if we're updating evidence_requested evidence
    const isUpdatingRequestedEvidence = updatingSourceForId !== null;
    
    if (isUpdatingRequestedEvidence) {
      // Update existing evidence with source
      const { error } = await supabase
        .from('evidence')
        .update({
          source_url: evidenceData.sourceUrl,
          source_type: evidenceData.sourceType,
          status: 'pending' // Reset to pending after adding source
        })
        .eq('id', updatingSourceForId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update evidence",
          variant: "destructive",
        });
        return;
      }

      // Rate the source if URL is provided
      if (evidenceData.sourceUrl) {
        try {
          const evidence = evidenceList.find(e => e.id === updatingSourceForId);
          console.log('[Rating] Starting source rating for updated evidence:', updatingSourceForId);
          const { data: ratingData, error: ratingError } = await supabase.functions.invoke('rate-source', {
            body: {
              sourceUrl: evidenceData.sourceUrl,
              evidenceDescription: evidence?.claim || evidenceData.content
            }
          });

          console.log('[Rating] Response received:', { ratingError, hasData: !!ratingData, ratingData });

          if (ratingError) {
            console.error('[Rating] Error from rate-source function:', ratingError);
            toast({
              title: "Rating Failed",
              description: "Could not rate the source. Evidence updated without rating.",
              variant: "destructive",
            });
          } else if (ratingData) {
            const { error: updateError } = await supabase
              .from('evidence')
              .update({
                source_rating: ratingData.rating,
                source_reasoning: JSON.stringify(ratingData.reasoning),
                source_confidence: ratingData.confidence,
                content_analyzed: ratingData.contentAnalyzed,
                source_warning: ratingData.warning,
                claim_evaluation: ratingData.claimEvaluation,
                suggested_correction: ratingData.suggestedCorrection,
                quote_example: ratingData.quoteExample
              })
              .eq('id', updatingSourceForId);

            if (updateError) {
              console.error('[Rating] Failed to update evidence with rating:', updateError);
              toast({
                title: "Rating Update Failed",
                description: "Source was rated but failed to save. Please try re-rating.",
                variant: "destructive",
              });
            } else {
              console.log('[Rating] Successfully updated evidence with rating');
              // Show rating animations
              if (ratingData.rating < 3) {
                showReaction('low_rating');
              } else if (ratingData.rating === 3) {
                showReaction('medium_rating');
              } else if (ratingData.rating > 3) {
                showReaction('high_rating');
              }
            }
          }
        } catch (error) {
          console.error('[Rating] Exception during rating:', error);
          toast({
            title: "Rating Error",
            description: error instanceof Error ? error.message : "Failed to rate source",
            variant: "destructive",
          });
        }
      }

      setIsAddingEvidence(false);
      setUpdatingSourceForId(null);
      loadEvidence();
      
      toast({
        title: "Source Added",
        description: "Your evidence has been updated with a source and is now pending review.",
      });
      return;
    }

    // Normal new evidence flow
    const { data: insertedEvidence, error } = await supabase
      .from('evidence')
      .insert({
        debate_id: discussionId,
        debater_id: user?.id,
        claim: evidenceData.content,
        source_url: evidenceData.sourceUrl,
        source_type: evidenceData.sourceType,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert evidence:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add evidence. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Rate the source if URL is provided
    if (evidenceData.sourceUrl && insertedEvidence) {
      try {
        console.log('[Rating] Starting source rating for evidence:', insertedEvidence.id);
        const { data: ratingData, error: ratingError } = await supabase.functions.invoke('rate-source', {
          body: {
            sourceUrl: evidenceData.sourceUrl,
            evidenceDescription: evidenceData.content
          }
        });

        console.log('[Rating] Response received:', { ratingError, hasData: !!ratingData, ratingData });

        if (ratingError) {
          console.error('[Rating] Error from rate-source function:', ratingError);
          toast({
            title: "Rating Failed",
            description: "Could not rate the source. Evidence added without rating.",
            variant: "destructive",
          });
        } else if (ratingData) {
          // Update evidence with rating and reasoning
          const { error: updateError } = await supabase
            .from('evidence')
            .update({
              source_rating: ratingData.rating,
              source_reasoning: JSON.stringify(ratingData.reasoning),
              source_confidence: ratingData.confidence,
              content_analyzed: ratingData.contentAnalyzed,
              source_warning: ratingData.warning,
              claim_evaluation: ratingData.claimEvaluation,
              suggested_correction: ratingData.suggestedCorrection,
              quote_example: ratingData.quoteExample
            })
            .eq('id', insertedEvidence.id);

          if (updateError) {
            console.error('[Rating] Failed to update evidence with rating:', updateError);
            toast({
              title: "Rating Update Failed",
              description: "Source was rated but failed to save. Please try re-rating.",
              variant: "destructive",
            });
          } else {
            console.log('[Rating] Successfully updated evidence with rating');
            // Show rating animations
            if (ratingData.rating < 3) {
              showReaction('low_rating');
            } else if (ratingData.rating === 3) {
              showReaction('medium_rating');
            } else if (ratingData.rating > 3) {
              showReaction('high_rating');
            }
          }
        }
      } catch (error) {
        console.error('[Rating] Exception during rating:', error);
        toast({
          title: "Rating Error",
          description: error instanceof Error ? error.message : "Failed to rate source",
          variant: "destructive",
        });
      }
    }

    setIsAddingEvidence(false);
    loadEvidence();
    
    toast({
      title: "Evidence Added",
      description: evidenceData.sourceUrl 
        ? "Evidence added and source rated by AI"
        : "Waiting for both participants to review and agree.",
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
    const basePoints = 2; // Increased from 1 to 2
    const sourceBonus = hasSource ? 2 : 0;
    const highQualitySourceBonus = (hasSource && evidence.source_rating && evidence.source_rating >= 4) ? 3 : 0;
    const totalPoints = basePoints + sourceBonus + highQualitySourceBonus;

    const isDebater1 = evidence.debater_id === discussion?.debater1_id;
    const newScore = isDebater1 
      ? discussion!.debater1_score + totalPoints 
      : discussion!.debater2_score + totalPoints;

    await supabase
      .from('debates')
      .update(isDebater1 ? { debater1_score: newScore } : { debater2_score: newScore })
      .eq('id', discussionId);

    // Notify the evidence creator that their evidence was agreed upon
    supabase.functions.invoke('notify-debate-action', {
      body: {
        targetUserId: evidence.debater_id,
        action: 'agreed',
        actorId: user?.id,
        message: evidence.claim
      }
    }).catch(err => console.error('Failed to send notification:', err));

    loadDiscussion();
    loadEvidence();

    toast({
      title: "Evidence Accepted",
      description: hasSource 
        ? `Both participants agreed on sourced evidence! +${totalPoints} points awarded.`
        : `Both participants agreed. +${totalPoints} points awarded.`,
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
    const basePoints = 5; // Increased from 2 to 5 for surviving a challenge
    const sourceBonus = hasSource ? 2 : 0;
    const highQualitySourceBonus = (hasSource && evidence.source_rating && evidence.source_rating >= 4) ? 3 : 0;
    const totalPoints = basePoints + sourceBonus + highQualitySourceBonus;

    const isDebater1 = evidence.debater_id === discussion?.debater1_id;
    const newScore = isDebater1 
      ? discussion!.debater1_score + totalPoints 
      : discussion!.debater2_score + totalPoints;

    await supabase
      .from('debates')
      .update(isDebater1 ? { debater1_score: newScore } : { debater2_score: newScore })
      .eq('id', discussionId);

    // Notify the challenger that evidence was validated (response to their challenge)
    const challengerId = evidence.debater_id === discussion?.debater1_id 
      ? discussion.debater2_id 
      : discussion.debater1_id;
    
    supabase.functions.invoke('notify-debate-action', {
      body: {
        targetUserId: challengerId,
        action: 'validated',
        actorId: user?.id,
        message: evidence.claim
      }
    }).catch(err => console.error('Failed to send notification:', err));

    loadDiscussion();
    loadEvidence();

    toast({
      title: "Evidence Validated",
      description: hasSource
        ? `Sourced evidence defended successfully! +${totalPoints} points awarded.`
        : `Evidence defended successfully! +${totalPoints} points awarded.`,
    });
  };

  const handleChallenge = async (evidenceId: string) => {
    const evidence = evidenceList.find(e => e.id === evidenceId);
    if (!evidence) return;

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

    // Notify the evidence creator that their evidence was challenged
    supabase.functions.invoke('notify-debate-action', {
      body: {
        targetUserId: evidence.debater_id,
        action: 'challenged',
        actorId: user?.id,
        message: evidence.claim
      }
    }).catch(err => console.error('Failed to send notification:', err));

    loadEvidence();
    toast({
      title: "Evidence Challenged",
      description: "You can now add counter-evidence to disprove the claim.",
    });
  };

  const handleRerateSource = async (evidenceId: string) => {
    const evidence = evidenceList.find(e => e.id === evidenceId);
    if (!evidence?.source_url) {
      toast({
        title: "No Source",
        description: "This evidence doesn't have a source to rate.",
        variant: "destructive",
      });
      return;
    }

    setIsReratingSource(true);

    try {
      const { data: ratingData, error: ratingError } = await supabase.functions.invoke('rate-source', {
        body: {
          sourceUrl: evidence.source_url,
          evidenceDescription: evidence.claim
        }
      });

      if (ratingError) {
        toast({
          title: "Rating Failed",
          description: "Failed to rate source. Please try again.",
          variant: "destructive",
        });
        setIsReratingSource(false);
        return;
      }

      if (ratingData) {
        await supabase
          .from('evidence')
          .update({
            source_rating: ratingData.rating,
            source_reasoning: JSON.stringify(ratingData.reasoning),
            source_confidence: ratingData.confidence,
            content_analyzed: ratingData.contentAnalyzed,
            source_warning: ratingData.warning,
            claim_evaluation: ratingData.claimEvaluation,
            suggested_correction: ratingData.suggestedCorrection,
            quote_example: ratingData.quoteExample
          })
          .eq('id', evidenceId);

        await loadEvidence();
        
        // Show rating animations
        if (ratingData.rating < 3) {
          showReaction('low_rating');
        } else if (ratingData.rating === 3) {
          showReaction('medium_rating');
        } else if (ratingData.rating > 3) {
          showReaction('high_rating');
        }
        
        toast({
          title: "Source Re-rated",
          description: `Updated rating: ${ratingData.rating}/5 with ${ratingData.confidence} confidence`,
        });
      }
    } catch (error) {
      console.error('Failed to re-rate source:', error);
      toast({
        title: "Error",
        description: "An error occurred while re-rating the source.",
        variant: "destructive",
      });
    }

    setIsReratingSource(false);
  };

  const handleRequestEvidence = async (evidenceId: string) => {
    const evidence = evidenceList.find(e => e.id === evidenceId);
    if (!evidence) return;

    const { error } = await supabase
      .from('evidence')
      .update({ status: 'evidence_requested' })
      .eq('id', evidenceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to request evidence",
        variant: "destructive",
      });
      return;
    }

    // Notify the evidence creator that evidence is requested
    supabase.functions.invoke('notify-debate-action', {
      body: {
        targetUserId: evidence.debater_id,
        action: 'evidence_requested',
        actorId: user?.id,
        message: evidence.claim
      }
    }).catch(err => console.error('Failed to send notification:', err));

    loadEvidence();
    toast({
      title: "Evidence Requested",
      description: "The participant must provide a source to validate their claim.",
    });
  };

  const handleAdmitDefeat = async () => {
    if (!discussion || !user) return;

    const isDebater1 = user.id === discussion.debater1_id;
    const winnerId = isDebater1 ? discussion.debater2_id : discussion.debater1_id;
    const winnerUsername = isDebater1 ? discussion.debater2.username : discussion.debater1.username;
    
    // Award 15 points to the winner (increased from 10)
    const victoryPoints = 15;
    const newWinnerScore = isDebater1 
      ? discussion.debater2_score + victoryPoints 
      : discussion.debater1_score + victoryPoints;

    const { error } = await supabase
      .from('debates')
      .update({
        status: 'completed',
        ...(isDebater1 
          ? { debater2_score: newWinnerScore } 
          : { debater1_score: newWinnerScore })
      })
      .eq('id', discussionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to process defeat",
        variant: "destructive",
      });
      return;
    }

    // Notify the winner
    supabase.functions.invoke('notify-debate-action', {
      body: {
        targetUserId: winnerId,
        action: 'victory',
        actorId: user.id,
        message: `You won the debate: "${discussion.topic}"`
      }
    }).catch(err => console.error('Failed to send notification:', err));

    setShowAdmitDefeatDialog(false);
    
    toast({
      title: "Debate Ended",
      description: `${winnerUsername} wins! +${victoryPoints} points awarded.`,
    });

    // Navigate back after a short delay
    setTimeout(() => {
      navigate('/discussions');
    }, 2000);
  };

  if (loading || !discussion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/20 to-background">
        <div className="animate-pulse text-lg">Loading discussion...</div>
      </div>
    );
  }

  // Calculate summary stats
  const agreedCount = evidenceList.filter(e => e.status === "agreed" || e.status === "validated").length;
  const challengedCount = evidenceList.filter(e => e.status === "challenged").length;
  const pendingCount = evidenceList.filter(e => e.status === "pending").length;
  const needsSourceCount = evidenceList.filter(e => e.status === "evidence_requested").length;

  const lastEvidence = evidenceList[evidenceList.length - 1];
  const canAddEvidence = evidenceList.length === 0 || 
    lastEvidence?.status === "agreed" || 
    lastEvidence?.status === "validated" ||
    (lastEvidence?.status === "challenged" && lastEvidence?.debater_id !== user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background flex flex-col">
      {/* VS Intro Animation */}
      {showVsIntro && (
        <VsIntroAnimation
          participant1={discussion.debater1.username}
          participant2={discussion.debater2.username}
          onComplete={() => {
            console.log('ActiveDiscussion: VS intro completed, setting showVsIntro to false');
            setShowVsIntro(false);
          }}
        />
      )}
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
            {!isSpectator && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowAdmitDefeatDialog(true)}
                className="text-xs"
              >
                Admit Defeat
              </Button>
            )}
            
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

        {/* Topic Banner */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Debate Topic</p>
            {isSpectator && (
              <Badge variant="secondary" className="text-xs">
                👁️ Spectating
              </Badge>
            )}
          </div>
          <p className="text-sm font-bold text-foreground leading-snug">
            {discussion.topic}
          </p>
        </div>

        {/* Summary Stats Bar */}
        {evidenceList.length > 0 && (
          <div className="flex items-center justify-center gap-3 px-4 py-2 border-b bg-muted/30">
            {agreedCount > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                {agreedCount} agreed
              </Badge>
            )}
            {challengedCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                {challengedCount} challenged
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                {pendingCount} pending
              </Badge>
            )}
            {needsSourceCount > 0 && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                {needsSourceCount} needs source
              </Badge>
            )}
          </div>
        )}
      </header>

      {/* AI Moderator Section */}
      {evidenceList.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border-b border-border/50">
          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">AI Moderator Analysis</h3>
                  {isLoadingEvaluation && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  {evaluationError && !isLoadingEvaluation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadAiEvaluation(evidenceList)}
                      className="h-6 text-xs"
                    >
                      Retry
                    </Button>
                  )}
                </div>
                {aiEvaluation ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {aiEvaluation}
                  </p>
                ) : isLoadingEvaluation ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-muted animate-pulse rounded" />
                    <div className="h-3 bg-muted animate-pulse rounded w-5/6" />
                    <div className="h-3 bg-muted animate-pulse rounded w-4/6" />
                  </div>
                ) : evaluationError ? (
                  <p className="text-sm text-destructive italic">
                    Failed to analyze - Click retry to try again
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Waiting for analysis...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Historical Timeline */}
          {evaluationHistory.length > 1 && (
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <button className="w-full px-4 py-2 border-t border-border/30 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <span className="text-xs font-medium text-muted-foreground">
                    View Analysis History ({evaluationHistory.length - 1} previous)
                  </span>
                  {showHistory ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 py-3 space-y-3 border-t border-border/20 bg-muted/5 max-h-64 overflow-y-auto">
                  {evaluationHistory.slice(1).map((evaluation, index) => (
                    <div key={evaluation.id} className="relative pl-4 border-l-2 border-border/40">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-purple-400" />
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(evaluation.created_at).toLocaleString()} · After {evaluation.evidence_count} rebuttals
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {evaluation.evaluation}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Timeline Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {evidenceList.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Plus className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {isSpectator ? "No rebuttals yet. Check back later!" : "No evidence yet"}
              </p>
              {!isSpectator && (
                <Button onClick={() => setIsAddingEvidence(true)}>
                  Add First Evidence
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="space-y-4 p-4 pb-24">
              {evidenceList.map((evidence, index) => {
                const isCurrentUser = evidence.debater_id === user?.id;
                const isPending = evidence.status === "pending";
                const isChallenged = evidence.status === "challenged";
                const isEvidenceRequested = evidence.status === "evidence_requested";
                
                // Determine if user can take action
                const canAgree = isPending && !isCurrentUser;
                const canChallenge = isPending && !isCurrentUser;
                const canRequestEvidence = isPending && !isCurrentUser;
                const canValidate = isChallenged && isCurrentUser;
                const canAddSource = isEvidenceRequested && isCurrentUser;
                
                // Determine if this needs user action (for highlighting)
                const needsAction = canAgree || canChallenge || canRequestEvidence || canValidate || canAddSource;

                return (
                  <TimelineEvidenceCard
                    key={evidence.id}
                    evidence={evidence}
                    index={index}
                    participantUsername={
                      evidence.debater_id === discussion.debater1_id
                        ? discussion.debater1.username
                        : discussion.debater2.username
                    }
                    isCurrentUser={isCurrentUser}
                    canAgree={canAgree}
                    canChallenge={canChallenge}
                    canRequestEvidence={canRequestEvidence}
                    canValidate={canValidate}
                    canAddSource={canAddSource}
                    needsAction={needsAction}
                    onAgree={() => handleAgree(evidence.id)}
                    onChallenge={() => handleChallenge(evidence.id)}
                    onRequestEvidence={() => handleRequestEvidence(evidence.id)}
                    onValidate={() => handleValidate(evidence.id)}
                    onAddSource={() => {
                      setUpdatingSourceForId(evidence.id);
                      setIsAddingEvidence(true);
                    }}
                    onRerateSource={() => handleRerateSource(evidence.id)}
                    isReratingSource={isReratingSource}
                  />
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Floating Add Rebuttal Button */}
      {!isSpectator && canAddEvidence && evidenceList.length > 0 && (
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-40"
          onClick={() => setIsAddingEvidence(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Add Rebuttal Dialog */}
      <AddEvidenceDialog
        open={isAddingEvidence}
        onOpenChange={(open) => {
          setIsAddingEvidence(open);
          if (!open) setUpdatingSourceForId(null);
        }}
        onSubmit={handleAddEvidence}
        currentParticipantName={currentParticipant === 1 ? discussion.debater1.username : discussion.debater2.username}
        existingClaim={updatingSourceForId ? evidenceList.find(e => e.id === updatingSourceForId)?.claim : undefined}
        isUpdatingSource={updatingSourceForId !== null}
        debateId={discussionId || undefined}
      />

      {/* Admit Defeat Confirmation Dialog */}
      <AlertDialog open={showAdmitDefeatDialog} onOpenChange={setShowAdmitDefeatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admit Defeat?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to admit defeat? Your opponent will be awarded 15 victory points and this debate will end.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdmitDefeat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Admit Defeat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActiveDiscussion;
