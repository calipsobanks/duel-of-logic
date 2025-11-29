import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentId: string;
  onSuccess: () => void;
}

export const AddSourceDialog = ({ open, onOpenChange, commentId, onSuccess }: AddSourceDialogProps) => {
  const [sourceUrl, setSourceUrl] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceUrl.trim()) {
      toast.error("Please enter a source URL");
      return;
    }

    setIsSubmitting(true);

    try {
      // First, get the comment to update
      const { data: comment, error: fetchError } = await supabase
        .from("discussion_comments")
        .select("content, score")
        .eq("id", commentId)
        .single();

      if (fetchError) throw fetchError;

      // Call AI to rate the source
      const { data: ratingData, error: ratingError } = await supabase.functions.invoke('rate-source', {
        body: {
          claim: comment.content + (additionalContext ? `\n\nAdditional context: ${additionalContext}` : ''),
          sourceUrl: sourceUrl.trim(),
        }
      });

      if (ratingError) throw ratingError;

      // Update comment with source and rating
      const { error: updateError } = await supabase
        .from("discussion_comments")
        .update({
          source_url: sourceUrl.trim(),
          source_type: ratingData.sourceType,
          source_rating: ratingData.rating,
          source_confidence: ratingData.confidence,
          source_reasoning: ratingData.reasoning,
          source_warning: ratingData.warning,
        })
        .eq("id", commentId);

      if (updateError) throw updateError;

      // Award bonus points for high-quality sources (4-5 rating on 1-5 scale)
      if (ratingData.rating >= 4) {
        const { error: pointsError } = await supabase
          .from("discussion_points")
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            comment_id: commentId,
            points_earned: 5,
            action_type: "high_quality_source",
          });

        if (pointsError) console.error("Error awarding bonus points:", pointsError);
      } else if (ratingData.rating >= 3) {
        const { error: pointsError } = await supabase
          .from("discussion_points")
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            comment_id: commentId,
            points_earned: 1,
            action_type: "comment_sourced",
          });

        if (pointsError) console.error("Error awarding points:", pointsError);
      }

      toast.success("Source added and evaluated!");
      setSourceUrl("");
      setAdditionalContext("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding source:", error);
      toast.error("Failed to add source");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
          <DialogDescription>
            Provide a credible source to back up your comment. AI will evaluate the source quality.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-url">Source URL *</Label>
            <Input
              id="source-url"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/article"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="context">Additional Context (optional)</Label>
            <Textarea
              id="context"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Any additional details to help verify the source..."
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Evaluating..." : "Add Source"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};