import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Swords, User, Link, AlertCircle, CheckCircle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DiscussionCommentProps {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string | null;
  likesCount: number;
  score: number;
  createdAt: string;
  currentUserId: string;
  postId: string;
  isLikedByUser: boolean;
  hasAgreed: boolean;
  hasDisagreed: boolean;
  sourceUrl: string | null;
  sourceRating: number | null;
  sourceConfidence: string | null;
  sourceWarning: string | null;
  sourceReasoning: string | null;
  claimEvaluation: string | null;
  onChallenge: (commentId: string, authorId: string, authorUsername: string) => void;
  onAddSource: (commentId: string) => void;
  onResponseChange: () => void;
}

export const DiscussionComment = ({
  id,
  content,
  authorId,
  authorUsername,
  authorAvatar,
  likesCount,
  score,
  createdAt,
  currentUserId,
  postId,
  isLikedByUser,
  hasAgreed,
  hasDisagreed,
  sourceUrl,
  sourceRating,
  sourceConfidence,
  sourceWarning,
  sourceReasoning,
  claimEvaluation,
  onChallenge,
  onAddSource,
  onResponseChange,
}: DiscussionCommentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const handleAgree = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (hasAgreed) {
        const { error } = await supabase
          .from("discussion_likes")
          .delete()
          .eq("user_id", currentUserId)
          .eq("comment_id", id)
          .eq("response_type", "agree");

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("discussion_likes")
          .insert({
            user_id: currentUserId,
            comment_id: id,
            response_type: "agree",
          });

        if (error) throw error;
      }
      onResponseChange();
    } catch (error) {
      console.error("Error agreeing:", error);
      toast.error("Failed to agree");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisagree = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (hasDisagreed) {
        const { error } = await supabase
          .from("discussion_likes")
          .delete()
          .eq("user_id", currentUserId)
          .eq("comment_id", id)
          .eq("response_type", "disagree");

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("discussion_likes")
          .insert({
            user_id: currentUserId,
            comment_id: id,
            response_type: "disagree",
          });

        if (error) throw error;
      }
      onResponseChange();
    } catch (error) {
      console.error("Error disagreeing:", error);
      toast.error("Failed to disagree");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLikeToggle = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isLikedByUser) {
        const { error } = await supabase
          .from("discussion_likes")
          .delete()
          .eq("user_id", currentUserId)
          .eq("comment_id", id)
          .eq("response_type", "like");

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("discussion_likes")
          .insert({
            user_id: currentUserId,
            comment_id: id,
            response_type: "like",
          });

        if (error) throw error;
      }
      onResponseChange();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSourceBadge = () => {
    if (!sourceRating) return null;
    
    // Rating is 1-5 scale
    if (sourceRating >= 4) {
      return <Badge variant="secondary" className="text-xs gap-1 bg-green-500/20 text-green-600 border-green-500/50">
        <CheckCircle className="h-3 w-3" />
        High Credibility ({sourceRating}/5)
      </Badge>;
    } else if (sourceRating >= 3) {
      return <Badge variant="secondary" className="text-xs gap-1">
        <CheckCircle className="h-3 w-3" />
        Moderate Credibility ({sourceRating}/5)
      </Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs gap-1 bg-orange-500/20 text-orange-600 border-orange-500/50">
        <AlertCircle className="h-3 w-3" />
        Low Credibility ({sourceRating}/5)
      </Badge>;
    }
  };

  const getClaimBadge = () => {
    if (!claimEvaluation) return null;

    switch (claimEvaluation) {
      case 'factual':
        return <Badge variant="secondary" className="text-xs gap-1 bg-blue-500/20 text-blue-600 border-blue-500/50">
          <CheckCircle className="h-3 w-3" />
          Factual
        </Badge>;
      case 'plausible':
        return <Badge variant="secondary" className="text-xs gap-1 bg-cyan-500/20 text-cyan-600 border-cyan-500/50">
          <Info className="h-3 w-3" />
          Plausible
        </Badge>;
      case 'misleading':
        return <Badge variant="secondary" className="text-xs gap-1 bg-orange-500/20 text-orange-600 border-orange-500/50">
          <AlertCircle className="h-3 w-3" />
          Misleading
        </Badge>;
      case 'wrong':
        return <Badge variant="secondary" className="text-xs gap-1 bg-red-500/20 text-red-600 border-red-500/50">
          <AlertCircle className="h-3 w-3" />
          Incorrect
        </Badge>;
      default:
        return null;
    }
  };

  const parseReasoning = () => {
    if (!sourceReasoning) return [];
    try {
      return JSON.parse(sourceReasoning);
    } catch {
      return [];
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
          <Badge variant="outline" className="text-xs">
            {score} pts
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">{content}</p>
        
        {/* Source Display */}
        {sourceUrl && (
          <div className="mb-3">
            <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-start gap-2 mb-2">
                  <Link className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a 
                      href={sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline break-all"
                    >
                      {sourceUrl}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {getSourceBadge()}
                  {getClaimBadge()}
                  {sourceConfidence && (
                    <span className="text-xs text-muted-foreground">
                      {sourceConfidence} confidence
                    </span>
                  )}
                </div>

                {sourceWarning && (
                  <p className="text-xs text-orange-600 mb-2 p-2 bg-orange-500/10 rounded border border-orange-500/20">
                    {sourceWarning}
                  </p>
                )}

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs w-full">
                    <Info className="h-3 w-3 mr-1" />
                    {showReasoning ? 'Hide' : 'Show'} AI Analysis
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2">
                  <div className="space-y-2 p-2 bg-background/50 rounded border">
                    <p className="text-xs font-semibold text-foreground">AI Reasoning:</p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {parseReasoning().map((point: string, index: number) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-primary font-semibold">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1 ${hasAgreed ? "text-green-600 bg-green-500/10" : ""}`}
            onClick={handleAgree}
            disabled={isProcessing || authorId === currentUserId}
          >
            <ThumbsUp className={`h-4 w-4 ${hasAgreed ? "fill-current" : ""}`} />
            <span>Agree</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1 ${hasDisagreed ? "text-red-600 bg-red-500/10" : ""}`}
            onClick={handleDisagree}
            disabled={isProcessing || authorId === currentUserId}
          >
            <ThumbsDown className={`h-4 w-4 ${hasDisagreed ? "fill-current" : ""}`} />
            <span>Disagree</span>
          </Button>
          {authorId !== currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => onChallenge(id, authorId, authorUsername)}
            >
              <Swords className="h-4 w-4" />
              <span>Challenge</span>
            </Button>
          )}
          {authorId === currentUserId && !sourceUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => onAddSource(id)}
            >
              <Link className="h-4 w-4" />
              <span>Add Source</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1 ml-auto ${isLikedByUser ? "text-primary" : ""}`}
            onClick={handleLikeToggle}
            disabled={isProcessing}
          >
            <ThumbsUp className={`h-4 w-4 ${isLikedByUser ? "fill-current" : ""}`} />
            <span>{likesCount}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};