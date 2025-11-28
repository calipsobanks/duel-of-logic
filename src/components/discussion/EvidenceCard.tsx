import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Star, Info } from "lucide-react";
import { useState } from "react";
import { ChallengeDialog } from "./ChallengeDialog";
import { LinkPreview } from "./LinkPreview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  sourceRating?: number;
  sourceReasoning?: string[];
  sourceConfidence?: "high" | "medium" | "low";
  contentAnalyzed?: boolean;
  sourceWarning?: string;
  claimEvaluation?: "factual" | "plausible" | "misleading" | "wrong";
  suggestedCorrection?: string;
  quoteExample?: string;
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
  const [showRatingDetails, setShowRatingDetails] = useState(false);
  
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
            <div className="mt-3 space-y-2">
              <LinkPreview url={evidence.sourceUrl} className="max-w-xs" />
              {evidence.sourceRating && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= evidence.sourceRating!
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {evidence.sourceRating} out of 5
                    </span>
                    {evidence.sourceConfidence && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          evidence.sourceConfidence === "high" 
                            ? "border-green-500/50 text-green-600" 
                            : evidence.sourceConfidence === "medium"
                            ? "border-yellow-500/50 text-yellow-600"
                            : "border-red-500/50 text-red-600"
                        }`}
                      >
                        {evidence.sourceConfidence} confidence
                      </Badge>
                    )}
                    {evidence.contentAnalyzed !== undefined && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          evidence.contentAnalyzed 
                            ? "border-blue-500/50 text-blue-600" 
                            : "border-orange-500/50 text-orange-600"
                        }`}
                      >
                        {evidence.contentAnalyzed ? "Content analyzed" : "URL only"}
                      </Badge>
                    )}
                    {evidence.sourceReasoning && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRatingDetails(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Info className="w-3 h-3 mr-1" />
                        Why this rating?
                      </Button>
                     )}
                  </div>
                  {evidence.claimEvaluation && (
                    <div className="mt-2">
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          evidence.claimEvaluation === "factual"
                            ? "border-green-500/50 text-green-600 bg-green-500/10"
                            : evidence.claimEvaluation === "plausible"
                            ? "border-blue-500/50 text-blue-600 bg-blue-500/10"
                            : evidence.claimEvaluation === "misleading"
                            ? "border-orange-500/50 text-orange-600 bg-orange-500/10"
                            : "border-red-500/50 text-red-600 bg-red-500/10"
                        }`}
                      >
                        Claim: {evidence.claimEvaluation}
                      </Badge>
                    </div>
                  )}
                  {evidence.sourceWarning && (
                    <div className="flex items-start gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md mt-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-600">{evidence.sourceWarning}</p>
                    </div>
                  )}
                  {(evidence.claimEvaluation === "misleading" || evidence.claimEvaluation === "wrong") && evidence.suggestedCorrection && (
                    <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md space-y-2">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-medium text-blue-600">Suggested Factual Statement:</p>
                          <p className="text-xs text-blue-600/90">{evidence.suggestedCorrection}</p>
                        </div>
                      </div>
                      {evidence.quoteExample && (
                        <div className="pl-6 space-y-1">
                          <p className="text-xs font-medium text-blue-600">Example Quote:</p>
                          <p className="text-xs text-blue-600/90 italic">{evidence.quoteExample}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                <LinkPreview url={challenge.sourceUrl} className="mt-2 max-w-xs" />
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

      <Dialog open={showRatingDetails} onOpenChange={setShowRatingDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Source Credibility Analysis</DialogTitle>
            <DialogDescription>
              GPT-5 analyzed this source {evidence.contentAnalyzed ? "by fetching and analyzing the actual website content" : "based on the URL structure only"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= (evidence.sourceRating || 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-semibold">
                {evidence.sourceRating} out of 5
              </span>
              {evidence.sourceConfidence && (
                <Badge 
                  variant="outline" 
                  className={
                    evidence.sourceConfidence === "high" 
                      ? "border-green-500/50 text-green-600" 
                      : evidence.sourceConfidence === "medium"
                      ? "border-yellow-500/50 text-yellow-600"
                      : "border-red-500/50 text-red-600"
                  }
                >
                  {evidence.sourceConfidence} confidence
                </Badge>
              )}
            </div>
            
            {evidence.contentAnalyzed !== undefined && (
              <div className="p-3 bg-muted/50 rounded-md border">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Analysis Method</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {evidence.contentAnalyzed 
                    ? "AI successfully fetched and analyzed the actual webpage content including text, title, and metadata."
                    : "AI was unable to access the webpage content and based this rating on URL structure and domain only."}
                </p>
              </div>
            )}

            {evidence.claimEvaluation && (
              <div className="p-3 bg-muted/50 rounded-md border">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Claim Evaluation</span>
                </div>
                <Badge 
                  variant="outline"
                  className={`text-sm ${
                    evidence.claimEvaluation === "factual"
                      ? "border-green-500/50 text-green-600 bg-green-500/10"
                      : evidence.claimEvaluation === "plausible"
                      ? "border-blue-500/50 text-blue-600 bg-blue-500/10"
                      : evidence.claimEvaluation === "misleading"
                      ? "border-orange-500/50 text-orange-600 bg-orange-500/10"
                      : "border-red-500/50 text-red-600 bg-red-500/10"
                  }`}
                >
                  {evidence.claimEvaluation.charAt(0).toUpperCase() + evidence.claimEvaluation.slice(1)}
                </Badge>
              </div>
            )}

            {evidence.sourceWarning && (
              <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-600">Warning</p>
                  <p className="text-sm text-orange-600/90">{evidence.sourceWarning}</p>
                </div>
              </div>
            )}
            
            {evidence.sourceReasoning && (
              <div>
                <h4 className="text-sm font-medium mb-2">Reasoning</h4>
                <ul className="space-y-2 list-disc list-inside text-sm">
                  {evidence.sourceReasoning.map((reason, idx) => (
                    <li key={idx} className="text-muted-foreground leading-relaxed">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(evidence.claimEvaluation === "misleading" || evidence.claimEvaluation === "wrong") && evidence.suggestedCorrection && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md space-y-3">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Suggested Factual Statement</p>
                  <p className="text-sm text-blue-600/90">{evidence.suggestedCorrection}</p>
                </div>
                {evidence.quoteExample && (
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Example How to Quote Properly</p>
                    <p className="text-sm text-blue-600/90 italic">{evidence.quoteExample}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};