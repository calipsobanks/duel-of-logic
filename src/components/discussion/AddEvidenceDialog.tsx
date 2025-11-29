import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";

interface AddEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (evidence: {
    submittedBy: string;
    content: string;
    sourceUrl?: string;
    sourceType?: "factual" | "opinionated";
  }) => void;
  currentParticipantName: string;
  existingClaim?: string; // For evidence_requested flow
  isUpdatingSource?: boolean; // Flag for updating vs. adding new
}

export const AddEvidenceDialog = ({
  open,
  onOpenChange,
  onSubmit,
  currentParticipantName,
  existingClaim,
  isUpdatingSource = false
}: AddEvidenceDialogProps) => {
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<"factual" | "opinionated">("factual");
  const { isRecording, isTranscribing, startRecording, stopRecording, cancelRecording } = useVoiceRecording();

  const handleStarterPhrase = (phrase: string) => {
    setContent(prev => {
      // If content is empty or doesn't start with the phrase, add it
      if (!prev) return `${phrase} `;
      // If it already starts with a starter phrase, replace it
      const starterPhrases = ["I think", "I believe", "I know that"];
      const startsWithStarter = starterPhrases.some(p => prev.startsWith(p));
      if (startsWithStarter) {
        const afterStarter = prev.replace(/^(I think|I believe|I know that)\s*/, '');
        return `${phrase} ${afterStarter}`;
      }
      // Otherwise prepend it
      return `${phrase} ${prev}`;
    });
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      try {
        const transcribedText = await stopRecording();
        setContent(prev => prev ? `${prev} ${transcribedText}` : transcribedText);
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    } else {
      await startRecording();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRecording) {
      cancelRecording();
    }
    
    // When updating source, we need the source URL
    if (isUpdatingSource && !sourceUrl) {
      return;
    }
    
    const evidenceContent = isUpdatingSource ? (existingClaim || "") : content;
    
    if (evidenceContent) {
      const evidenceData = {
        submittedBy: currentParticipantName,
        content: evidenceContent,
        ...(sourceUrl && { sourceUrl, sourceType })
      };

      onSubmit(evidenceData);
      
      // Reset form
      setContent("");
      setSourceUrl("");
      setSourceType("factual");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isUpdatingSource ? "Add Source to Evidence" : "Add Evidence"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isUpdatingSource ? (
            <div className="space-y-2">
              <Label className="text-base">Your Claim</Label>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-foreground">{existingClaim}</p>
              </div>
              <p className="text-sm text-yellow-600 flex items-center gap-2">
                <span>⚠️</span>
                Your opponent requested a source for this claim. Please provide one below.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content" className="text-base">
                  Evidence Description
                </Label>
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleVoiceToggle}
                  disabled={isTranscribing}
                  className="gap-2"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Transcribing...
                    </>
                  ) : isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Voice Input
                    </>
                  )}
                </Button>
              </div>
              <div className="flex gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Start with:</span>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleStarterPhrase("I think")}
                >
                  I think
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleStarterPhrase("I believe")}
                >
                  I believe
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleStarterPhrase("I know that")}
                >
                  I know that
                </Badge>
              </div>
              <Textarea
                id="content"
                placeholder="Describe your evidence and how it supports your argument..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px]"
                required
                disabled={isTranscribing}
              />
              {isRecording && (
                <p className="text-sm text-destructive animate-pulse">
                  🔴 Recording... Click "Stop Recording" when done
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sourceUrl" className="text-base">
              Source URL {isUpdatingSource ? <span className="text-destructive">(Required)</span> : <span className="text-muted-foreground text-sm">(Optional - Bonus points if provided)</span>}
            </Label>
            <Input
              id="sourceUrl"
              type="url"
              placeholder="https://example.com/source"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required={isUpdatingSource}
            />
          </div>

          {sourceUrl && (
            <div className="space-y-3">
              <Label className="text-base">Source Classification</Label>
              <RadioGroup
                value={sourceType}
                onValueChange={(value) => setSourceType(value as "factual" | "opinionated")}
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="factual" id="factual" />
                  <Label htmlFor="factual" className="flex-1 cursor-pointer">
                    <span className="font-semibold">Factual Source</span>
                    <p className="text-sm text-muted-foreground">
                      Based on verifiable data, research, or objective information
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="opinionated" id="opinionated" />
                  <Label htmlFor="opinionated" className="flex-1 cursor-pointer">
                    <span className="font-semibold">Opinionated Source</span>
                    <p className="text-sm text-muted-foreground">
                      Contains subjective views, interpretations, or editorial content
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isUpdatingSource ? !sourceUrl : !content}
            >
              {isUpdatingSource ? "Add Source" : "Submit Evidence"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};