import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AddEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (evidence: {
    submittedBy: string;
    content: string;
    sourceUrl: string;
    sourceType: "factual" | "opinionated";
  }) => void;
  currentDebaterName: string;
}

export const AddEvidenceDialog = ({
  open,
  onOpenChange,
  onSubmit,
  currentDebaterName
}: AddEvidenceDialogProps) => {
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<"factual" | "opinionated">("factual");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (content && sourceUrl) {
      onSubmit({
        submittedBy: currentDebaterName,
        content,
        sourceUrl,
        sourceType
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
            <Label htmlFor="content" className="text-base">
              Evidence Description
            </Label>
            <Textarea
              id="content"
              placeholder="Describe your evidence and how it supports your argument..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceUrl" className="text-base">
              Source URL
            </Label>
            <Input
              id="sourceUrl"
              type="url"
              placeholder="https://example.com/source"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required
            />
          </div>

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
              disabled={!content || !sourceUrl}
            >
              Submit Evidence
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
