import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Star, 
  AlertTriangle, 
  Info,
  Check,
  X,
  Shield,
  RefreshCw
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

interface TimelineEvidenceCardProps {
  evidence: {
    id: string;
    debater_id: string;
    claim: string;
    source_url?: string | null;
    source_type?: string | null;
    source_rating?: number | null;
    source_reasoning?: string | null;
    source_confidence?: string | null;
    source_warning?: string | null;
    content_analyzed?: boolean | null;
    status: string;
    created_at: string;
  };
  index: number;
  participantUsername: string;
  isCurrentUser: boolean;
  canAgree: boolean;
  canChallenge: boolean;
  canRequestEvidence: boolean;
  canValidate: boolean;
  canAddSource: boolean;
  needsAction: boolean;
  onAgree: () => void;
  onChallenge: () => void;
  onRequestEvidence: () => void;
  onValidate: () => void;
  onAddSource: () => void;
  onRerateSource: () => void;
  isReratingSource: boolean;
}

export const TimelineEvidenceCard = ({
  evidence,
  index,
  participantUsername,
  isCurrentUser,
  canAgree,
  canChallenge,
  canRequestEvidence,
  canValidate,
  canAddSource,
  needsAction,
  onAgree,
  onChallenge,
  onRequestEvidence,
  onValidate,
  onAddSource,
  onRerateSource,
  isReratingSource,
}: TimelineEvidenceCardProps) => {
  // Determine border and background color based on status
  const getStatusStyles = () => {
    switch (evidence.status) {
      case "agreed":
      case "validated":
        return "border-l-4 border-l-green-500 bg-green-500/5";
      case "challenged":
        return "border-l-4 border-l-red-500 bg-red-500/5";
      case "evidence_requested":
        return "border-l-4 border-l-orange-500 bg-orange-500/5";
      case "pending":
      default:
        return "border-l-4 border-l-yellow-500 bg-yellow-500/5";
    }
  };

  const getStatusBadge = () => {
    switch (evidence.status) {
      case "agreed":
        return <Badge className="bg-green-500">Agreed 🤝</Badge>;
      case "validated":
        return <Badge className="bg-green-600">Validated</Badge>;
      case "challenged":
        return <Badge variant="destructive">Challenged</Badge>;
      case "evidence_requested":
        return <Badge className="bg-orange-500">Source Requested</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div
      className={`relative rounded-lg border bg-card p-4 transition-all ${getStatusStyles()} ${
        needsAction ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Badge variant="outline" className="text-xs">
            #{index + 1}
          </Badge>
          <span className="text-sm font-semibold">@{participantUsername}</span>
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs">
              You
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(evidence.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Source Type Badge */}
      {evidence.source_type && (
        <Badge
          variant={evidence.source_type === "factual" ? "default" : "secondary"}
          className="mb-2 text-xs"
        >
          {evidence.source_type === "factual" ? "📊 Factual" : "💭 Opinion"}
        </Badge>
      )}

      {/* Claim */}
      <p className="text-base leading-relaxed mb-3">{evidence.claim}</p>

      {/* Source Information */}
      {evidence.source_url && (
        <div className="space-y-2 mb-3 p-3 bg-muted/50 rounded-md border">
          <a
            href={evidence.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            View Source
          </a>

          {evidence.source_rating && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= evidence.source_rating!
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium">
                  {evidence.source_rating}/5
                </span>
                {evidence.source_confidence && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      evidence.source_confidence === "high"
                        ? "border-green-500/50 text-green-600"
                        : evidence.source_confidence === "medium"
                        ? "border-yellow-500/50 text-yellow-600"
                        : "border-red-500/50 text-red-600"
                    }`}
                  >
                    {evidence.source_confidence}
                  </Badge>
                )}
                {evidence.content_analyzed !== undefined && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      evidence.content_analyzed
                        ? "border-blue-500/50 text-blue-600"
                        : "border-orange-500/50 text-orange-600"
                    }`}
                  >
                    {evidence.content_analyzed ? "Content analyzed" : "URL only"}
                  </Badge>
                )}
              </div>

              {/* Action Buttons for Source */}
              {evidence.source_reasoning && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRerateSource}
                    disabled={isReratingSource}
                    className="h-7 px-2 text-xs"
                  >
                    <RefreshCw
                      className={`w-3 h-3 mr-1 ${isReratingSource ? "animate-spin" : ""}`}
                    />
                    Re-rate
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Info className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Source Credibility Analysis</DialogTitle>
                        <DialogDescription>
                          AI analyzed this source{" "}
                          {evidence.content_analyzed
                            ? "by fetching and analyzing the actual website content"
                            : "based on the URL structure only"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= (evidence.source_rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-lg font-semibold">
                            {evidence.source_rating} out of 5
                          </span>
                        </div>

                        {evidence.source_warning && (
                          <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-orange-600">Warning</p>
                              <p className="text-sm text-orange-600/90">
                                {evidence.source_warning}
                              </p>
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-medium mb-2">Reasoning</h4>
                          <ul className="space-y-2 list-disc list-inside text-sm">
                            {JSON.parse(evidence.source_reasoning).map(
                              (reason: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-muted-foreground leading-relaxed"
                                >
                                  {reason}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {evidence.source_warning && (
                <div className="flex items-start gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
                  <AlertTriangle className="w-3 h-3 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-600">{evidence.source_warning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {(canAgree || canChallenge || canRequestEvidence || canValidate || canAddSource) && (
        <div className="flex items-center gap-2 pt-2 border-t">
          {canAgree && (
            <Button
              size="sm"
              onClick={onAgree}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <Check className="w-4 h-4 mr-1" />
              Agree
            </Button>
          )}
          {canChallenge && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onChallenge}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              Challenge
            </Button>
          )}
          {canRequestEvidence && (
            <Button
              size="sm"
              onClick={onRequestEvidence}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Request Source
            </Button>
          )}
          {canValidate && (
            <Button
              size="sm"
              onClick={onValidate}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <Shield className="w-4 h-4 mr-1" />
              Validate
            </Button>
          )}
          {canAddSource && (
            <Button
              size="sm"
              onClick={onAddSource}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600"
            >
              <Shield className="w-4 h-4 mr-1" />
              Add Source
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
