import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, Save } from "lucide-react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useToast } from "@/hooks/use-toast";

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
  debateId?: string; // For unique draft storage
}

export const AddEvidenceDialog = ({
  open,
  onOpenChange,
  onSubmit,
  currentParticipantName,
  existingClaim,
  isUpdatingSource = false,
  debateId
}: AddEvidenceDialogProps) => {
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<"factual" | "opinionated">("factual");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { isRecording, isTranscribing, startRecording, stopRecording, cancelRecording } = useVoiceRecording();
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Get draft storage key
  const getDraftKey = () => {
    if (isUpdatingSource) return null; // Don't save drafts for source updates
    return debateId ? `evidence-draft-${debateId}` : 'evidence-draft-global';
  };

  // Load draft when dialog opens
  useEffect(() => {
    if (open && !isUpdatingSource) {
      const draftKey = getDraftKey();
      if (draftKey) {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            setContent(draft.content || "");
            setSourceUrl(draft.sourceUrl || "");
            setSourceType(draft.sourceType || "factual");
            setLastSaved(new Date(draft.timestamp));
            toast({
              title: "Draft Restored",
              description: "Your previous draft has been restored.",
            });
          } catch (error) {
            console.error('Failed to load draft:', error);
          }
        }
      }
    }
  }, [open, isUpdatingSource, debateId]);

  // Auto-save draft while typing (debounced)
  useEffect(() => {
    if (!open || isUpdatingSource) return;

    const draftKey = getDraftKey();
    if (!draftKey) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only save if there's content
    if (content || sourceUrl) {
      saveTimeoutRef.current = setTimeout(() => {
        const draft = {
          content,
          sourceUrl,
          sourceType,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setLastSaved(new Date());
      }, 1000); // Save after 1 second of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, sourceUrl, sourceType, open, isUpdatingSource, debateId]);

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
    
    // Validate starter phrase for new evidence
    if (!isUpdatingSource && evidenceContent) {
      const starterPhrases = ["I think", "I believe", "I know that"];
      const startsWithRequired = starterPhrases.some(phrase => evidenceContent.trim().startsWith(phrase));
      
      if (!startsWithRequired) {
        toast({
          title: "Invalid Rebuttal Format",
          description: "Your rebuttal must start with 'I think', 'I believe', or 'I know that'",
          variant: "destructive"
        });
        return;
      }
    }
    
    if (evidenceContent) {
      const evidenceData = {
        submittedBy: currentParticipantName,
        content: evidenceContent,
        ...(sourceUrl && { sourceUrl, sourceType })
      };

      onSubmit(evidenceData);
      
      // Clear draft from localStorage on successful submit
      const draftKey = getDraftKey();
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      
      // Reset form
      setContent("");
      setSourceUrl("");
      setSourceType("factual");
      setLastSaved(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-2xl">
            <span>{isUpdatingSource ? "Add Source to Rebuttal" : "Add Rebuttal"}</span>
            {!isUpdatingSource && lastSaved && (
              <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                <Save className="w-3 h-3" />
                Draft saved {new Date().getTime() - lastSaved.getTime() < 60000 
                  ? 'just now' 
                  : `${Math.floor((new Date().getTime() - lastSaved.getTime()) / 60000)}m ago`}
              </span>
            )}
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
                  Rebuttal Description
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
                  className="cursor-pointer hover:bg-accent transition-all hover:scale-105"
                  onClick={() => handleStarterPhrase("I think")}
                >
                  I think
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-all hover:scale-105"
                  onClick={() => handleStarterPhrase("I believe")}
                >
                  I believe
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-all hover:scale-105"
                  onClick={() => handleStarterPhrase("I know that")}
                >
                  I know that
                </Badge>
              </div>
              <Textarea
                id="content"
                placeholder='Start with "I think", "I believe", or "I know that"...'
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
              {isUpdatingSource ? "Add Source" : "Submit Rebuttal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};