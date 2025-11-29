import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChallengeToDebateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengerId: string;
  challengedId: string;
  challengedUsername: string;
  postId: string;
  commentId: string;
  defaultTopic: string;
  onSuccess: () => void;
}

export const ChallengeToDebateDialog = ({
  open,
  onOpenChange,
  challengerId,
  challengedId,
  challengedUsername,
  postId,
  commentId,
  defaultTopic,
  onSuccess,
}: ChallengeToDebateDialogProps) => {
  const [topic, setTopic] = useState(defaultTopic);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChallenge = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a debate topic");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("debate_challenges")
        .insert({
          challenger_id: challengerId,
          challenged_id: challengedId,
          post_id: postId,
          comment_id: commentId,
          topic: topic.trim(),
          status: "pending",
        });

      if (error) throw error;

      toast.success(`Challenge sent to @${challengedUsername}!`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error sending challenge:", error);
      toast.error("Failed to send challenge");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Challenge to Debate</DialogTitle>
          <DialogDescription>
            Send a 1v1 debate challenge to @{challengedUsername}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Debate Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should you debate about?"
              maxLength={200}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleChallenge} disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Challenge"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};