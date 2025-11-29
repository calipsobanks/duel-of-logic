import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

export const PostTopicDialog = ({ open, onOpenChange, onSuccess, userId }: PostTopicDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarterPhrase = (phrase: string) => {
    setTitle(prev => {
      // If title is empty or doesn't start with the phrase, add it
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const starterPhrases = ["I think", "I believe", "I know that"];
    const startsWithRequired = starterPhrases.some(phrase => title.trim().startsWith(phrase));
    
    if (!startsWithRequired) {
      toast.error("Please start your topic with 'I think', 'I believe', or 'I know that'");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("discussion_posts")
        .insert({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
        });

      if (error) throw error;

      toast.success("Topic posted successfully!");
      setTitle("");
      setDescription("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error posting topic:", error);
      toast.error("Failed to post topic");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Post a Discussion Topic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Topic Title *</Label>
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
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context to your topic..."
              rows={4}
              maxLength={1000}
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
              {isSubmitting ? "Posting..." : "Post Topic"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};