import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Swords, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiscussionCommentProps {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string | null;
  likesCount: number;
  createdAt: string;
  currentUserId: string;
  postId: string;
  isLikedByUser: boolean;
  onChallenge: (commentId: string, authorId: string, authorUsername: string) => void;
  onLikeToggle: () => void;
}

export const DiscussionComment = ({
  id,
  content,
  authorId,
  authorUsername,
  authorAvatar,
  likesCount,
  createdAt,
  currentUserId,
  postId,
  isLikedByUser,
  onChallenge,
  onLikeToggle,
}: DiscussionCommentProps) => {
  const [isLiking, setIsLiking] = useState(false);

  const handleLikeToggle = async () => {
    if (isLiking) return;
    setIsLiking(true);

    try {
      if (isLikedByUser) {
        const { error } = await supabase
          .from("discussion_likes")
          .delete()
          .eq("user_id", currentUserId)
          .eq("comment_id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("discussion_likes")
          .insert({
            user_id: currentUserId,
            comment_id: id,
          });

        if (error) throw error;
      }
      onLikeToggle();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="flex gap-3 p-4 bg-card rounded-lg border">
      <Avatar className="h-10 w-10">
        <AvatarImage src={authorAvatar || ""} />
        <AvatarFallback>
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{authorUsername}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{content}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1 ${isLikedByUser ? "text-primary" : ""}`}
            onClick={handleLikeToggle}
            disabled={isLiking}
          >
            <ThumbsUp className={`h-4 w-4 ${isLikedByUser ? "fill-current" : ""}`} />
            <span>{likesCount}</span>
          </Button>
          {authorId !== currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => onChallenge(id, authorId, authorUsername)}
            >
              <Swords className="h-4 w-4" />
              <span>Challenge to Debate</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};