import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { ChallengeDialog } from "./ChallengeDialog";

interface Challenge {
  id: string;
  submittedBy: string;
  content: string;
  sourceUrl: string;
  sourceType: "factual" | "opinionated";
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

interface EvidenceCardProps {
  evidence: Evidence;
  index: number;
  currentDebater: 1 | 2;
  debater1Name: string;
  debater2Name: string;
  onAgree: (evidenceId: string, debater: 1 | 2) => void;
  onChallenge: (evidenceId: string, challenge: Omit<Challenge, "id">) => void;
  onValidate: (evidenceId: string) => void;
}

export const EvidenceCard = ({
  evidence,
  index,
  currentDebater,
  debater1Name,
  debater2Name,
  onAgree,
  onChallenge,
  onValidate
}: EvidenceCardProps) => {
  const [isChallenging, setIsChallenging] = useState(false);
  
  const isDebater1 = currentDebater === 1;
  const currentDebaterName = isDebater1 ? debater1Name : debater2Name;
  const hasAgreed = isDebater1 ? evidence.debater1Agreed : evidence.debater2Agreed;
  const submittedByCurrentDebater = evidence.submittedBy === currentDebaterName;

  const statusColor = {
    pending: "bg-debate-warning/10 text-debate-warning border-debate-warning/20",
    agreed: "bg-debate-success/10 text-debate-success border-debate-success/20",
    challenged: "bg-destructive/10 text-destructive border-destructive/20",
    validated: "bg-primary/10 text-primary border-primary/20"
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-semibold">
              Evidence #{index}
            </Badge>
            <Badge 
              variant="outline" 
              className={statusColor[evidence.status]}
            >
              {evidence.status === "agreed" && <CheckCircle className="w-3 h-3 mr-1" />}
              {evidence.status === "challenged" && <AlertTriangle className="w-3 h-3 mr-1" />}
              {evidence.status.charAt(0).toUpperCase() + evidence.status.slice(1)}
            </Badge>
            <Badge variant={evidence.sourceType === "factual" ? "default" : "secondary"}>
              {evidence.sourceType === "factual" ? "Factual Source" : "Opinionated Source"}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Submitted by {evidence.submittedBy}
          </p>

          <p className="text-foreground leading-relaxed">
            {evidence.content}
          </p>

          <a 
            href={evidence.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            View Source
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Agreement Status */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <CheckCircle className={`w-5 h-5 ${evidence.debater1Agreed ? 'text-debate-success' : 'text-muted'}`} />
          <span className="text-sm text-muted-foreground">{debater1Name}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className={`w-5 h-5 ${evidence.debater2Agreed ? 'text-debate-success' : 'text-muted'}`} />
          <span className="text-sm text-muted-foreground">{debater2Name}</span>
        </div>
      </div>

      {/* Actions */}
      {evidence.status === "pending" && !submittedByCurrentDebater && (
        <div className="flex gap-3 pt-2">
          <Button
            variant="default"
            onClick={() => onAgree(evidence.id, currentDebater)}
            disabled={hasAgreed}
            className="flex-1"
          >
            {hasAgreed ? "Agreed" : "Agree"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsChallenging(true)}
            className="flex-1"
          >
            Challenge
          </Button>
        </div>
      )}

      {/* Challenged state - both debaters can respond */}
      {evidence.status === "challenged" && (
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setIsChallenging(true)}
            className="flex-1"
          >
            {submittedByCurrentDebater ? "Defend Evidence" : "Add Counter-Challenge"}
          </Button>
          <Button
            variant="default"
            onClick={() => onValidate(evidence.id)}
            className="flex-1"
          >
            Validate Original Evidence
          </Button>
        </div>
      )}

      {/* Challenges */}
      {evidence.challenges.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-sm text-foreground">Challenges:</h4>
          {evidence.challenges.map((challenge) => (
            <Card key={challenge.id} className="p-4 bg-muted/30">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Challenge by {challenge.submittedBy}
                  </Badge>
                  <Badge variant={challenge.sourceType === "factual" ? "default" : "secondary"} className="text-xs">
                    {challenge.sourceType === "factual" ? "Factual" : "Opinionated"}
                  </Badge>
                </div>
                <p className="text-sm text-foreground">{challenge.content}</p>
                <a 
                  href={challenge.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View Source
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ChallengeDialog
        open={isChallenging}
        onOpenChange={setIsChallenging}
        onSubmit={(challenge) => {
          onChallenge(evidence.id, challenge);
          setIsChallenging(false);
        }}
        currentDebaterName={currentDebaterName}
      />
    </Card>
  );
};
