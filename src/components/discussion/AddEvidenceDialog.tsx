import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
}

export const AddEvidenceDialog = ({
  open,
  onOpenChange,
  onSubmit,
  currentParticipantName
}: AddEvidenceDialogProps) => {
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<"factual" | "opinionated">("factual");
  const { isRecording, isTranscribing, startRecording, stopRecording, cancelRecording } = useVoiceRecording();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRecording) {
      cancelRecording();
    }
    
    if (content) {
      onSubmit({
        submittedBy: currentParticipantName,
        content,
        ...(sourceUrl && { sourceUrl, sourceType })
      });
      
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
          <DialogTitle className="text-2xl">Add Evidence</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-2">
            <Label htmlFor="sourceUrl" className="text-base">
              Source URL <span className="text-muted-foreground text-sm">(Optional - Bonus points if provided)</span>
            </Label>
            <Input
              id="sourceUrl"
              type="url"
              placeholder="https://example.com/source"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
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
              disabled={!content}
            >
              Submit Evidence
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};