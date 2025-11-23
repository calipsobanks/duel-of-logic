import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";
import { EvidenceCard } from "@/components/debate/EvidenceCard";
import { AddEvidenceDialog } from "@/components/debate/AddEvidenceDialog";
import { useToast } from "@/components/ui/use-toast";

interface DebateSetup {
  debater1Name: string;
  debater2Name: string;
  topic: string;
  reasoningType: "inductive" | "deductive";
}

interface Evidence {
  id: string;
  submittedBy: string;
  content: string;
  sourceUrl: string;
  sourceType: "factual" | "opinionated";
  status: "pending" | "agreed" | "challenged" | "validated";
  debater1Agreed: boolean;
  debater2Agreed: boolean;
  challenges: Challenge[];
}

interface Challenge {
  id: string;
  submittedBy: string;
  content: string;
  sourceUrl: string;
  sourceType: "factual" | "opinionated";
}

const ActiveDebate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [debateSetup, setDebateSetup] = useState<DebateSetup | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [currentDebater, setCurrentDebater] = useState<1 | 2>(1);

  useEffect(() => {
    const setup = localStorage.getItem('debateSetup');
    if (!setup) {
      navigate('/debate/setup');
      return;
    }
    setDebateSetup(JSON.parse(setup));
  }, [navigate]);

  const handleAddEvidence = (evidence: Omit<Evidence, "id" | "status" | "debater1Agreed" | "debater2Agreed" | "challenges">) => {
    const newEvidence: Evidence = {
      ...evidence,
      id: Date.now().toString(),
      status: "pending",
      debater1Agreed: evidence.submittedBy === debateSetup?.debater1Name,
      debater2Agreed: evidence.submittedBy === debateSetup?.debater2Name,
      challenges: []
    };

    setEvidenceList([...evidenceList, newEvidence]);
    setIsAddingEvidence(false);
    
    toast({
      title: "Evidence Added",
      description: "Waiting for both debaters to review and agree.",
    });
  };

  const handleAgree = (evidenceId: string, debater: 1 | 2) => {
    setEvidenceList(evidenceList.map(ev => {
      if (ev.id === evidenceId) {
        const updated = {
          ...ev,
          debater1Agreed: debater === 1 ? true : ev.debater1Agreed,
          debater2Agreed: debater === 2 ? true : ev.debater2Agreed,
        };
        
        if (updated.debater1Agreed && updated.debater2Agreed) {
          updated.status = "agreed";
          toast({
            title: "Evidence Accepted",
            description: "Both debaters have agreed. You can proceed to the next evidence.",
          });
        }
        
        return updated;
      }
      return ev;
    }));
  };

  const handleChallenge = (evidenceId: string, challenge: Omit<Challenge, "id">) => {
    setEvidenceList(evidenceList.map(ev => {
      if (ev.id === evidenceId) {
        return {
          ...ev,
          status: "challenged",
          challenges: [...ev.challenges, { ...challenge, id: Date.now().toString() }]
        };
      }
      return ev;
    }));

    toast({
      title: "Challenge Added",
      description: "Counter-evidence has been submitted for review.",
    });
  };

  const handleValidate = (evidenceId: string) => {
    setEvidenceList(evidenceList.map(ev => {
      if (ev.id === evidenceId) {
        toast({
          title: "Evidence Validated",
          description: "The original evidence has been accepted. You can proceed to the next evidence.",
        });
        return {
          ...ev,
          status: "validated"
        };
      }
      return ev;
    }));
  };

  if (!debateSetup) return null;

  const canAddEvidence = evidenceList.length === 0 || 
    (evidenceList[evidenceList.length - 1].status === "agreed" || 
     evidenceList[evidenceList.length - 1].status === "validated");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-debate-blue-light py-8">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/debate/setup')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>

        {/* Header */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {debateSetup.topic}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {debateSetup.reasoningType === "inductive" ? "Inductive" : "Deductive"} Reasoning
                </Badge>
                <span className="text-muted-foreground">
                  {debateSetup.debater1Name} vs {debateSetup.debater2Name}
                </span>
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
        </Card>

        {/* Debater Switch */}
        <div className="mb-8 flex justify-center">
          <Card className="inline-flex p-1">
            <Button
              variant={currentDebater === 1 ? "default" : "ghost"}
              onClick={() => setCurrentDebater(1)}
              className="rounded-md"
            >
              {debateSetup.debater1Name}
            </Button>
            <Button
              variant={currentDebater === 2 ? "default" : "ghost"}
              onClick={() => setCurrentDebater(2)}
              className="rounded-md"
            >
              {debateSetup.debater2Name}
            </Button>
          </Card>
        </div>

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
              <EvidenceCard
                key={evidence.id}
                evidence={evidence}
                index={index + 1}
                currentDebater={currentDebater}
                debater1Name={debateSetup.debater1Name}
                debater2Name={debateSetup.debater2Name}
                onAgree={handleAgree}
                onChallenge={handleChallenge}
                onValidate={handleValidate}
              />
            ))
          )}
        </div>

        {/* Add Evidence Dialog */}
        <AddEvidenceDialog
          open={isAddingEvidence}
          onOpenChange={setIsAddingEvidence}
          onSubmit={handleAddEvidence}
          currentDebaterName={currentDebater === 1 ? debateSetup.debater1Name : debateSetup.debater2Name}
        />
      </div>
    </div>
  );
};

export default ActiveDebate;
