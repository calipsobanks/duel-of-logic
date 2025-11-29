import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ThumbsUp, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { DiscussionComment } from "@/components/discussion/DiscussionComment";
import { ChallengeToDebateDialog } from "@/components/discussion/ChallengeToDebateDialog";
import { AddSourceDialog } from "@/components/discussion/AddSourceDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourcesButton } from "@/components/sources/SourcesButton";

interface Post {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  likes_count: number;
  score: number;
  created_at: string;
  source_url: string | null;
  source_quote: string | null;
  source_rating: number | null;
  source_confidence: string | null;
  source_warning: string | null;
  source_reasoning: string | null;
  claim_evaluation?: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Like {
  user_id: string;
  post_id: string | null;
  comment_id: string | null;
  response_type: string;
}

export default function DiscussionThread() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceQuote, setSourceQuote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [challengeDialog, setChallengeDialog] = useState<{
    open: boolean;
    commentId: string;
    userId: string;
    username: string;
  }>({ open: false, commentId: "", userId: "", username: "" });
  const [sourceDialog, setSourceDialog] = useState<{
    open: boolean;
    commentId: string;
  }>({ open: false, commentId: "" });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadPost();
    loadComments();
    loadLikes();
  }, [postId, user]);

  const loadPost = async () => {
    if (!postId) return;

    const { data, error } = await supabase
      .from("discussion_posts")
      .select("*, profiles(username, avatar_url)")
      .eq("id", postId)
      .single();

    if (error) {
      console.error("Error loading post:", error);
      toast.error("Failed to load post");
      return;
    }

    setPost(data);
  };

  const loadComments = async () => {
    if (!postId) return;

    const { data, error } = await supabase
      .from("discussion_comments")
      .select("*, profiles(username, avatar_url)")
      .eq("post_id", postId)
      .order("score", { ascending: false });

    if (error) {
      console.error("Error loading comments:", error);
      return;
    }

    setComments(data || []);
  };

  const loadLikes = async () => {
    if (!postId || comments.length === 0) return;

    const commentIds = comments.map(c => c.id).join(",");
    const { data, error } = await supabase
      .from("discussion_likes")
      .select("user_id, post_id, comment_id, response_type")
      .or(`post_id.eq.${postId},comment_id.in.(${commentIds})`);

    if (error) {
      console.error("Error loading likes:", error);
      return;
    }

    setLikes(data || []);
  };

  const handlePostLike = async () => {
    if (!user || !post || isLiking) return;
    setIsLiking(true);

    const isLiked = likes.some(l => l.user_id === user.id && l.post_id === post.id);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from("discussion_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("discussion_likes")
          .insert({
            user_id: user.id,
            post_id: post.id,
          });

        if (error) throw error;
      }
      
      await loadPost();
      await loadLikes();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !postId || !newComment.trim()) return;

    // Validate starter phrase
    const starterPhrases = ["I think", "I believe", "I know that"];
    const startsWithRequired = starterPhrases.some(phrase => newComment.trim().startsWith(phrase));
    
    if (!startsWithRequired) {
      toast.error("Please start your comment with 'I think', 'I believe', or 'I know that'");
      return;
    }

    // Validate that if source URL is provided, quote is also required
    if (sourceUrl.trim() && !sourceQuote.trim()) {
      toast.error("Please provide a quote from your source");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert comment first
      const { data: newCommentData, error: insertError } = await supabase
        .from("discussion_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If source URL is provided, rate it with AI
      if (sourceUrl.trim()) {
        const claimWithQuote = sourceQuote.trim() 
          ? `${newComment.trim()}\n\nQuoted from source: "${sourceQuote.trim()}"`
          : newComment.trim();

        const { data: ratingData, error: ratingError } = await supabase.functions.invoke('rate-source', {
          body: {
            sourceUrl: sourceUrl.trim(),
            evidenceDescription: claimWithQuote,
          }
        });

        if (ratingError) {
          console.error("Error rating source:", ratingError);
          toast.error("Comment posted but source rating failed");
        } else {
          // Update comment with source and rating
          const { error: updateError } = await supabase
            .from("discussion_comments")
            .update({
              source_url: sourceUrl.trim(),
              source_quote: sourceQuote.trim() || null,
              source_rating: ratingData.rating,
              source_confidence: ratingData.confidence,
              source_reasoning: JSON.stringify(ratingData.reasoning),
              source_warning: ratingData.warning,
              claim_evaluation: ratingData.claimEvaluation,
            })
            .eq("id", newCommentData.id);

          if (updateError) {
            console.error("Error updating source:", updateError);
          }

          // Award points for sourced comments
          if (ratingData.rating >= 4) {
            await supabase.from("discussion_points").insert({
              user_id: user.id,
              comment_id: newCommentData.id,
              points_earned: 5,
              action_type: "high_quality_source",
            });
          } else if (ratingData.rating >= 3) {
            await supabase.from("discussion_points").insert({
              user_id: user.id,
              comment_id: newCommentData.id,
              points_earned: 1,
              action_type: "comment_sourced",
            });
          }
        }
      }

      toast.success("Comment posted!");
      setNewComment("");
      setSourceUrl("");
      setSourceQuote("");
      await loadComments();
      await loadPost();
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChallenge = (commentId: string, userId: string, username: string) => {
    setChallengeDialog({ open: true, commentId, userId, username });
  };

  const handleAddSource = (commentId: string) => {
    setSourceDialog({ open: true, commentId });
  };

  const isPostLikedByUser = post && likes.some(l => l.user_id === user?.id && l.post_id === post.id && l.response_type === 'like');

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-pulse">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        <Button
          variant="ghost"
          className="mb-4 hover-scale"
          onClick={() => navigate("/discussions")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Discussions
        </Button>

        {/* Post Header */}
        <div className="bg-card rounded-lg border p-6 mb-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.profiles.avatar_url || ""} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground mb-2">{post.title}</h1>
              <p className="text-sm text-muted-foreground">
                by {post.profiles.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {post.description && (
            <p className="text-foreground mb-4 whitespace-pre-wrap">{post.description}</p>
          )}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 ${isPostLikedByUser ? "text-primary" : ""}`}
              onClick={handlePostLike}
              disabled={isLiking}
            >
              <ThumbsUp className={`h-4 w-4 ${isPostLikedByUser ? "fill-current" : ""}`} />
              <span>{post.likes_count}</span>
            </Button>
            <span className="text-sm text-muted-foreground">{post.comments_count} comments</span>
          </div>
        </div>

        {/* Add Comment */}
        <div className="bg-card rounded-lg border p-4 mb-6 animate-fade-in">
          <div className="flex gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Start with:</span>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-all hover:scale-105"
              onClick={() => {
                const starterPhrases = ["I think", "I believe", "I know that"];
                const startsWithStarter = starterPhrases.some(p => newComment.startsWith(p));
                if (!newComment) {
                  setNewComment("I think ");
                } else if (startsWithStarter) {
                  const afterStarter = newComment.replace(/^(I think|I believe|I know that)\s*/, '');
                  setNewComment(`I think ${afterStarter}`);
                } else {
                  setNewComment(`I think ${newComment}`);
                }
              }}
            >
              I think
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-all hover:scale-105"
              onClick={() => {
                const starterPhrases = ["I think", "I believe", "I know that"];
                const startsWithStarter = starterPhrases.some(p => newComment.startsWith(p));
                if (!newComment) {
                  setNewComment("I believe ");
                } else if (startsWithStarter) {
                  const afterStarter = newComment.replace(/^(I think|I believe|I know that)\s*/, '');
                  setNewComment(`I believe ${afterStarter}`);
                } else {
                  setNewComment(`I believe ${newComment}`);
                }
              }}
            >
              I believe
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-all hover:scale-105"
              onClick={() => {
                const starterPhrases = ["I think", "I believe", "I know that"];
                const startsWithStarter = starterPhrases.some(p => newComment.startsWith(p));
                if (!newComment) {
                  setNewComment("I know that ");
                } else if (startsWithStarter) {
                  const afterStarter = newComment.replace(/^(I think|I believe|I know that)\s*/, '');
                  setNewComment(`I know that ${afterStarter}`);
                } else {
                  setNewComment(`I know that ${newComment}`);
                }
              }}
            >
              I know that
            </Badge>
          </div>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder='Start with "I think", "I believe", or "I know that"...'
            rows={3}
            className="mb-3"
          />
          
          {/* Optional Source Fields */}
          <div className="space-y-3 mb-3">
            <div className="space-y-2">
              <Label htmlFor="comment-source" className="text-xs text-muted-foreground">
                Source URL (optional) - Add credibility to your comment
              </Label>
              <Input
                id="comment-source"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
              />
            </div>
            
            {sourceUrl && (
              <div className="space-y-2">
                <Label htmlFor="comment-quote" className="text-xs text-muted-foreground">
                  Quote from source (required) - Help others verify quickly
                </Label>
                <Textarea
                  id="comment-quote"
                  value={sourceQuote}
                  onChange={(e) => setSourceQuote(e.target.value)}
                  placeholder='e.g., "Studies show that 87% of participants..."'
                  rows={2}
                  maxLength={500}
                  required
                />
                {sourceUrl && !sourceQuote.trim() && (
                  <p className="text-xs text-destructive">Please provide a quote from your source</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSubmitComment} 
              disabled={isSubmitting || !newComment.trim() || (sourceUrl.trim() && !sourceQuote.trim())}
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Comments</h2>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => (
                  <DiscussionComment
                    key={comment.id}
                    id={comment.id}
                    content={comment.content}
                    authorId={comment.user_id}
                    authorUsername={comment.profiles.username}
                    authorAvatar={comment.profiles.avatar_url}
                    likesCount={comment.likes_count}
                    score={comment.score}
                    createdAt={comment.created_at}
                    currentUserId={user?.id || ""}
                    postId={post.id}
                    isLikedByUser={likes.some(l => l.user_id === user?.id && l.comment_id === comment.id && l.response_type === 'like')}
                    hasAgreed={likes.some(l => l.user_id === user?.id && l.comment_id === comment.id && l.response_type === 'agree')}
                    hasDisagreed={likes.some(l => l.user_id === user?.id && l.comment_id === comment.id && l.response_type === 'disagree')}
                    hasRequestedSource={likes.some(l => l.user_id === user?.id && l.comment_id === comment.id && l.response_type === 'source_request')}
                    sourceRequestsCount={likes.filter(l => l.comment_id === comment.id && l.response_type === 'source_request').length}
                    sourceUrl={comment.source_url}
                    sourceQuote={comment.source_quote}
                    sourceRating={comment.source_rating}
                    sourceConfidence={comment.source_confidence}
                    sourceWarning={comment.source_warning}
                    sourceReasoning={comment.source_reasoning}
                    claimEvaluation={comment.claim_evaluation || null}
                    onChallenge={handleChallenge}
                    onAddSource={handleAddSource}
                    onResponseChange={async () => {
                      await loadComments();
                      await loadLikes();
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Challenge Dialog */}
      <ChallengeToDebateDialog
        open={challengeDialog.open}
        onOpenChange={(open) => setChallengeDialog({ ...challengeDialog, open })}
        challengerId={user?.id || ""}
        challengedId={challengeDialog.userId}
        challengedUsername={challengeDialog.username}
        postId={post.id}
        commentId={challengeDialog.commentId}
        defaultTopic={post.title}
        onSuccess={() => {
          toast.success("Challenge sent!");
          setChallengeDialog({ open: false, commentId: "", userId: "", username: "" });
        }}
      />

      {/* Add Source Dialog */}
      <AddSourceDialog
        open={sourceDialog.open}
        onOpenChange={(open) => setSourceDialog({ ...sourceDialog, open })}
        commentId={sourceDialog.commentId}
        onSuccess={async () => {
          await loadComments();
          setSourceDialog({ open: false, commentId: "" });
        }}
      />

      {/* Sources Button */}
      <SourcesButton />
    </div>
  );
}