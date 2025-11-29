import { MessageSquare, ThumbsUp, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface DiscussionPostCardProps {
  id: string;
  title: string;
  description: string | null;
  authorUsername: string;
  authorAvatar: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  onViewThread: (postId: string) => void;
}

export const DiscussionPostCard = ({
  id,
  title,
  description,
  authorUsername,
  authorAvatar,
  likesCount,
  commentsCount,
  createdAt,
  onViewThread,
}: DiscussionPostCardProps) => {
  return (
    <Card className="hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-fade-in" onClick={() => onViewThread(id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorAvatar || ""} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2">{title}</h3>
            <p className="text-sm text-muted-foreground">
              by {authorUsername} · {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardHeader>
      {description && (
        <CardContent className="pt-0 pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </CardContent>
      )}
      <CardContent className="pt-0 pb-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ThumbsUp className="h-4 w-4" />
            <span>{likesCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{commentsCount}</span>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto hover-scale" onClick={(e) => {
            e.stopPropagation();
            onViewThread(id);
          }}>
            Join Discussion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};