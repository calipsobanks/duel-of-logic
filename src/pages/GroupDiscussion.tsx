import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, TrendingUp, MessageSquare, ArrowLeft } from "lucide-react";
import { AddEvidenceDialog } from "@/components/discussion/AddEvidenceDialog";
import { toast } from "sonner";
import { TimelineEvidenceCard } from "@/components/discussion/TimelineEvidenceCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Participant {
  id: string;
  user_id: string;
  stance: string;
  has_submitted_evidence: boolean;
  score: number;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface GroupEvidence {
  id: string;
  user_id: string;
  claim: string;
  source_url: string | null;
  source_type: string | null;
  source_rating: number | null;
  source_reasoning: string | null;
  source_confidence: string | null;
  source_warning: string | null;
  claim_evaluation: string | null;
  suggested_correction: string | null;
  quote_example: string | null;
  created_at: string;
  profiles: {
    username: string;
  };
  responses: {
    respondent_id: string;
    response_type: string;
  }[];
}

interface Discussion {
  id: string;
  topic_id: string;
  status: string;
  controversial_topics: {
    title: string;
    question: string | null;
  };
}

export default function GroupDiscussion() {
  const [searchParams] = useSearchParams();
  const discussionId = searchParams.get("id");
  const navigate = useNavigate();
  const { user } = useAuth();
  useAnalytics();

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evidence, setEvidence] = useState<GroupEvidence[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [selectedStance, setSelectedStance] = useState<string | null>(null);

  useEffect(() => {
    if (!discussionId) {
      navigate("/discussions");
      return;
    }
    loadDiscussion();
  }, [discussionId, user]);

  const loadDiscussion = async () => {
    if (!user) return;

    try {
      // Load discussion details
      const { data: discussionData, error: discussionError } = await supabase
        .from("group_discussions")
        .select(`
          *,
          controversial_topics (
            title,
            question
          )
        `)
        .eq("id", discussionId)
        .single();

      if (discussionError) throw discussionError;
      setDiscussion(discussionData);

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("group_discussion_participants")
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq("discussion_id", discussionId);

      if (participantsError) throw participantsError;
      setParticipants(participantsData);

      // Find current participant
      const currentP = participantsData.find((p) => p.user_id === user.id);
      setCurrentParticipant(currentP || null);

      // Load evidence with responses
      const { data: evidenceData, error: evidenceError } = await supabase
        .from("group_evidence")
        .select(`
          *,
          profiles (
            username
          ),
          group_evidence_responses (
            respondent_id,
            response_type
          )
        `)
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: false });

      if (evidenceError) throw evidenceError;
      
      // Map the data to match our interface
      const mappedEvidence = evidenceData?.map((item: any) => ({
        ...item,
        responses: item.group_evidence_responses || []
      })) || [];
      
      setEvidence(mappedEvidence);
    } catch (error: any) {
      console.error("Error loading discussion:", error);
      toast.error("Failed to load discussion");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDiscussion = async (stance: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("group_discussion_participants")
        .insert({
          discussion_id: discussionId!,
          user_id: user.id,
          stance,
        });

      if (error) throw error;

      toast.success("Joined discussion!");
      setSelectedStance(null);
      loadDiscussion();
    } catch (error: any) {
      console.error("Error joining discussion:", error);
      toast.error("Failed to join discussion");
    }
  };

  const handleAddEvidence = async (evidenceData: {
    claim: string;
    sourceUrl?: string;
    sourceType?: string;
  }) => {
    if (!user) return;

    try {
      // Check if user can submit (must have responded to all others' evidence)
      const otherEvidence = evidence.filter((e) => e.user_id !== user.id);
      const userResponses = evidence
        .flatMap((e) => e.responses)
        .filter((r) => r.respondent_id === user.id);

      if (currentParticipant?.has_submitted_evidence && userResponses.length < otherEvidence.length) {
        toast.error("You must respond to all other evidence first!");
        return;
      }

      // Rate the source if provided
      let sourceRating = null;
      let sourceReasoning = null;
      let sourceConfidence = null;
      let sourceWarning = null;

      if (evidenceData.sourceUrl) {
        const { data: ratingData, error: ratingError } = await supabase.functions.invoke(
          "rate-source",
          {
            body: {
              sourceUrl: evidenceData.sourceUrl,
              evidenceDescription: evidenceData.claim,
            },
          }
        );

        if (!ratingError && ratingData) {
          sourceRating = ratingData.rating;
          sourceReasoning = ratingData.reasoning;
          sourceConfidence = ratingData.confidence;
          sourceWarning = ratingData.warning;
        }
      }

      // Insert evidence
      const { error } = await supabase.from("group_evidence").insert({
        discussion_id: discussionId!,
        user_id: user.id,
        claim: evidenceData.claim,
        source_url: evidenceData.sourceUrl || null,
        source_type: evidenceData.sourceType || null,
        source_rating: sourceRating,
        source_reasoning: sourceReasoning,
        source_confidence: sourceConfidence,
        source_warning: sourceWarning,
      });

      if (error) throw error;

      // Update participant's has_submitted_evidence
      await supabase
        .from("group_discussion_participants")
        .update({ has_submitted_evidence: true })
        .eq("discussion_id", discussionId!)
        .eq("user_id", user.id);

      toast.success("Evidence submitted!");
      setShowAddEvidence(false);
      loadDiscussion();
    } catch (error: any) {
      console.error("Error adding evidence:", error);
      toast.error("Failed to add evidence");
    }
  };

  const handleRespond = async (evidenceId: string, responseType: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("group_evidence_responses").insert({
        evidence_id: evidenceId,
        respondent_id: user.id,
        response_type: responseType,
      });

      if (error) throw error;

      // If agreeing, increment the evidence owner's score
      if (responseType === "agree") {
        const evidenceItem = evidence.find((e) => e.id === evidenceId);
        if (evidenceItem) {
          const { data: participantData } = await supabase
            .from("group_discussion_participants")
            .select("score")
            .eq("discussion_id", discussionId!)
            .eq("user_id", evidenceItem.user_id)
            .single();

          if (participantData) {
            await supabase
              .from("group_discussion_participants")
              .update({ score: participantData.score + 1 })
              .eq("discussion_id", discussionId!)
              .eq("user_id", evidenceItem.user_id);
          }
        }
      }

      toast.success(`Response recorded!`);
      loadDiscussion();
    } catch (error: any) {
      console.error("Error responding:", error);
      toast.error("Failed to respond");
    }
  };

  const canSubmitEvidence = () => {
    if (!currentParticipant) return false;
    if (!currentParticipant.has_submitted_evidence) return true;

    const otherEvidence = evidence.filter((e) => e.user_id !== user?.id);
    const myResponses = evidence
      .flatMap((e) => e.responses)
      .filter((r) => r.respondent_id === user?.id);

    return myResponses.length >= otherEvidence.length;
  };

  const hasRespondedTo = (evidenceId: string) => {
    const evidenceItem = evidence.find((e) => e.id === evidenceId);
    return evidenceItem?.responses.some((r) => r.respondent_id === user?.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentParticipant && !selectedStance) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="p-8">
            <h1 className="text-3xl font-bold mb-4">{discussion?.controversial_topics.title}</h1>
            <p className="text-lg text-muted-foreground mb-8">
              {discussion?.controversial_topics.question}
            </p>

            <div className="space-y-4">
              <p className="text-sm font-medium">Choose your stance to join:</p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  onClick={() => handleJoinDiscussion("agree")}
                  className="h-24"
                >
                  <div className="text-center">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2" />
                    <div>Agree</div>
                  </div>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => handleJoinDiscussion("disagree")}
                  className="h-24"
                >
                  <div className="text-center">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 rotate-180" />
                    <div>Disagree</div>
                  </div>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold">{discussion?.controversial_topics.title}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{participants.length} participants</span>
            </div>
            <Badge variant={currentParticipant?.stance === "agree" ? "default" : "secondary"}>
              Your stance: {currentParticipant?.stance}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Participants Sidebar */}
          <Card className="p-4 h-fit">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants
            </h2>
            <div className="space-y-3">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.profiles.avatar_url || undefined} />
                    <AvatarFallback>{p.profiles.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.profiles.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.stance} • {p.score} pts
                    </div>
                  </div>
                  {p.has_submitted_evidence && (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Evidence Timeline */}
          <div className="lg:col-span-2">
            {canSubmitEvidence() && (
              <Button onClick={() => setShowAddEvidence(true)} className="w-full mb-4">
                Submit Evidence
              </Button>
            )}

            {!canSubmitEvidence() && currentParticipant?.has_submitted_evidence && (
              <Card className="p-4 bg-muted mb-4">
                <p className="text-sm text-muted-foreground text-center">
                  Respond to all other evidence before submitting more
                </p>
              </Card>
            )}

            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-6 pr-4">
                {evidence.map((e, index) => {
                  const isMyEvidence = e.user_id === user?.id;
                  const responded = hasRespondedTo(e.id);

                  return (
                    <div key={e.id} className="relative">
                      {index < evidence.length - 1 && (
                        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-border" />
                      )}
                      <TimelineEvidenceCard
                        evidence={{
                          id: e.id,
                          claim: e.claim,
                          source_url: e.source_url,
                          source_type: e.source_type,
                          source_rating: e.source_rating,
                          source_reasoning: e.source_reasoning,
                          source_confidence: e.source_confidence,
                          source_warning: e.source_warning,
                          content_analyzed: false,
                          status: responded ? "responded" : "pending",
                          created_at: e.created_at,
                          debater_id: e.user_id,
                        }}
                        index={index}
                        participantUsername={e.profiles.username}
                        isCurrentUser={isMyEvidence}
                        canAgree={!isMyEvidence && !responded}
                        canChallenge={false}
                        canRequestEvidence={false}
                        canValidate={false}
                        canAddSource={false}
                        needsAction={!isMyEvidence && !responded}
                        onAgree={() => handleRespond(e.id, "agree")}
                        onChallenge={() => {}}
                        onRequestEvidence={() => {}}
                        onValidate={() => {}}
                        onAddSource={() => {}}
                        onRerateSource={() => {}}
                        isReratingSource={false}
                      />
                    </div>
                  );
                })}

                {evidence.length === 0 && (
                  <Card className="p-12 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No evidence submitted yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Be the first to share!</p>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <AddEvidenceDialog
        open={showAddEvidence}
        onOpenChange={setShowAddEvidence}
        onSubmit={(evidence) => handleAddEvidence({
          claim: evidence.content,
          sourceUrl: evidence.sourceUrl,
          sourceType: evidence.sourceType
        })}
        currentParticipantName={currentParticipant?.profiles.username || ""}
      />
    </div>
  );
}
