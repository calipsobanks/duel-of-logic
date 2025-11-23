import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";
import { EvidenceCard } from "@/components/debate/EvidenceCard";
import { AddEvidenceDialog } from "@/components/debate/AddEvidenceDialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DebateData {
  id: string;
  topic: string;
  debater1_id: string;
  debater2_id: string;
  debater1_score: number;
  debater2_score: number;
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

const ActiveDebate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debateId = searchParams.get('id');
  const { toast } = useToast();
  const { user } = useAuth();
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [currentDebater, setCurrentDebater] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!debateId) {
      navigate('/debates');
      return;
    }

    loadDebate();
    loadEvidence();
  }, [debateId, user, navigate]);

  const loadDebate = async () => {
    const { data, error } = await supabase
      .from('debates')
      .select(`
        *,
        debater1:profiles!debates_debater1_id_fkey(username),
        debater2:profiles!debates_debater2_id_fkey(username)
      `)
      .eq('id', debateId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load debate",
        variant: "destructive",
      });
      navigate('/debates');
      return;
    }

    setDebate(data);
    setCurrentDebater(data.debater1_id === user?.id ? 1 : 2);
    setLoading(false);
  };

  const loadEvidence = async () => {
    const { data, error } = await supabase
      .from('evidence')
      .select('*')
      .eq('debate_id', debateId)
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
        debate_id: debateId,
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
      description: "Waiting for both debaters to review and agree.",
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

    // Award points
    const hasSource = !!evidence.source_url;
    const basePoints = 1;
    const sourceBonus = hasSource ? 2 : 0;
    const totalPoints = basePoints + sourceBonus;

    const isDebater1 = evidence.debater_id === debate?.debater1_id;
    const newScore = isDebater1 
      ? debate!.debater1_score + totalPoints 
      : debate!.debater2_score + totalPoints;

    await supabase
      .from('debates')
      .update(isDebater1 ? { debater1_score: newScore } : { debater2_score: newScore })
      .eq('id', debateId);

    loadDebate();
    loadEvidence();

    toast({
      title: "Evidence Accepted",
      description: hasSource 
        ? `Both debaters agreed on sourced evidence! +${totalPoints} points awarded.`
        : `Both debaters agreed. +${totalPoints} point awarded.`,
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

    // Award points
    const hasSource = !!evidence.source_url;
    const basePoints = 2;
    const sourceBonus = hasSource ? 2 : 0;
    const totalPoints = basePoints + sourceBonus;

    const isDebater1 = evidence.debater_id === debate?.debater1_id;
    const newScore = isDebater1 
      ? debate!.debater1_score + totalPoints 
      : debate!.debater2_score + totalPoints;

    await supabase
      .from('debates')
      .update(isDebater1 ? { debater1_score: newScore } : { debater2_score: newScore })
      .eq('id', debateId);

    loadDebate();
    loadEvidence();

    toast({
      title: "Evidence Validated",
      description: hasSource
        ? `Sourced evidence defended successfully! +${totalPoints} points awarded.`
        : `Evidence defended successfully! +${totalPoints} points awarded.`,
    });
  };

  if (loading || !debate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading debate...</p>
      </div>
    );
  }

  const canAddEvidence = evidenceList.length === 0 || 
    (evidenceList[evidenceList.length - 1].status === "agreed" || 
     evidenceList[evidenceList.length - 1].status === "validated");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-debate-blue-light py-8">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/debates')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Debates
        </Button>

        {/* Header */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {debate.topic}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-muted-foreground">
                  {debate.debater1.username} vs {debate.debater2.username}
                </span>
              </div>
            </div>

            {/* Score Display */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">{debate.debater1.username}</div>
                <div className="text-3xl font-bold text-debate-blue">{debate.debater1_score}</div>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">{debate.debater2.username}</div>
                <div className="text-3xl font-bold text-debate-amber">{debate.debater2_score}</div>
              </div>
            </div>
            
            <Button
              size="lg"
              onClick={() => setIsAddingEvidence(true)}
              disabled={!canAddEvidence}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Evidence
            </Button>
          </div>

          {/* Leading Indicator */}
          {debate.debater1_score !== debate.debater2_score && evidenceList.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {debate.debater1_score > debate.debater2_score ? debate.debater1.username : debate.debater2.username}
                </span>
                {" "}is currently leading by{" "}
                <span className="font-semibold text-foreground">
                  {Math.abs(debate.debater1_score - debate.debater2_score)} point{Math.abs(debate.debater1_score - debate.debater2_score) !== 1 ? 's' : ''}
                </span>
              </p>
            </div>
          )}
        </Card>

        {/* Evidence List */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {evidenceList.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-lg text-muted-foreground">
                No evidence submitted yet. Click "Add Evidence" to begin the debate.
              </p>
            </Card>
          ) : (
            evidenceList.map((evidence, index) => (
              <Card key={evidence.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="text-sm text-muted-foreground">
                        by {evidence.debater_id === debate.debater1_id ? debate.debater1.username : debate.debater2.username}
                      </span>
                      {evidence.source_type && (
                        <Badge variant={evidence.source_type === "factual" ? "default" : "secondary"}>
                          {evidence.source_type}
                        </Badge>
                      )}
                    </div>
                    <Badge variant={
                      evidence.status === "agreed" ? "default" :
                      evidence.status === "validated" ? "default" :
                      evidence.status === "challenged" ? "destructive" :
                      "secondary"
                    }>
                      {evidence.status}
                    </Badge>
                  </div>
                  
                  <p className="text-foreground">{evidence.claim}</p>
                  
                  {evidence.source_url && (
                    <a 
                      href={evidence.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline block"
                    >
                      View Source →
                    </a>
                  )}

                  {evidence.status === "pending" && evidence.debater_id !== user?.id && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleAgree(evidence.id)} size="sm">
                        Agree
                      </Button>
                    </div>
                  )}

                  {evidence.status === "challenged" && evidence.debater_id === user?.id && (
                    <Button onClick={() => handleValidate(evidence.id)} size="sm">
                      Validate
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Add Evidence Dialog */}
        <AddEvidenceDialog
          open={isAddingEvidence}
          onOpenChange={setIsAddingEvidence}
          onSubmit={handleAddEvidence}
          currentDebaterName={currentDebater === 1 ? debate.debater1.username : debate.debater2.username}
        />
      </div>
    </div>
  );
};

export default ActiveDebate;