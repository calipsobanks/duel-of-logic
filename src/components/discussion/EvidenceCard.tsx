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
  sourceUrl?: string;
  sourceType?: "factual" | "opinionated";
  status: "pending" | "agreed" | "challenged" | "validated";
  participant1Agreed: boolean;
  participant2Agreed: boolean;
  challenges: Challenge[];
}

interface EvidenceCardProps {
  evidence: Evidence;
  index: number;
  currentParticipant: 1 | 2;
  participant1Name: string;
  participant2Name: string;
  onAgree: (evidenceId: string, participant: 1 | 2) => void;
  onChallenge: (evidenceId: string, challenge: Omit<Challenge, "id">) => void;
  onValidate: (evidenceId: string) => void;
}

export const EvidenceCard = ({
  evidence,
  index,
  currentParticipant,
  participant1Name,
  participant2Name,
  onAgree,
  onChallenge,
  onValidate
}: EvidenceCardProps) => {
  const [isChallenging, setIsChallenging] = useState(false);
  
  const isParticipant1 = currentParticipant === 1;
  const currentParticipantName = isParticipant1 ? participant1Name : participant2Name;
  const hasAgreed = isParticipant1 ? evidence.participant1Agreed : evidence.participant2Agreed;
  const submittedByCurrentParticipant = evidence.submittedBy === currentParticipantName;

  const statusColor = {
    pending: "bg-discussion-warning/10 text-discussion-warning border-discussion-warning/20",
    agreed: "bg-discussion-success/10 text-discussion-success border-discussion-success/20",
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
            {evidence.sourceUrl && evidence.sourceType && (
              <Badge variant={evidence.sourceType === "factual" ? "default" : "secondary"}>
                {evidence.sourceType === "factual" ? "Factual Source" : "Opinionated Source"}
              </Badge>
            )}
            {!evidence.sourceUrl && (
              <Badge variant="outline" className="text-xs">
                No Source
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Submitted by {evidence.submittedBy}
          </p>

          <p className="text-foreground leading-relaxed">
            {evidence.content}
          </p>

          {evidence.sourceUrl && (
            <a 
              href={evidence.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              View Source
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Agreement Status */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <CheckCircle className={`w-5 h-5 ${evidence.participant1Agreed ? 'text-discussion-success' : 'text-muted'}`} />
          <span className="text-sm text-muted-foreground">{participant1Name}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className={`w-5 h-5 ${evidence.participant2Agreed ? 'text-discussion-success' : 'text-muted'}`} />
          <span className="text-sm text-muted-foreground">{participant2Name}</span>
        </div>
      </div>

      {/* Actions */}
      {evidence.status === "pending" && !submittedByCurrentParticipant && (
        <div className="flex gap-3 pt-2">
          <Button
            variant="default"
            onClick={() => onAgree(evidence.id, currentParticipant)}
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

      {/* Challenged state - both participants can respond */}
      {evidence.status === "challenged" && (
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setIsChallenging(true)}
            className="flex-1"
          >
            {submittedByCurrentParticipant ? "Defend Evidence" : "Add Counter-Challenge"}
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
        currentParticipantName={currentParticipantName}
      />
    </Card>
  );
};