import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, TrendingUp, Loader2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface TopConversation {
  id: string;
  title: string;
  description: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export const ControversialTopics = () => {
  const [conversations, setConversations] = useState<TopConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTopConversations();
  }, []);

  const loadTopConversations = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('discussion_posts')
        .select(`
          id,
          title,
          description,
          likes_count,
          comments_count,
          created_at,
          user_id,
          profiles (
            username,
            avatar_url
          )
        `)
        .gte('created_at', oneWeekAgo.toISOString())
        .order('likes_count', { ascending: false })
        .order('comments_count', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const mappedConversations: TopConversation[] = data.map((post: any) => ({
          id: post.id,
          title: post.title,
          description: post.description,
          likes_count: post.likes_count,
          comments_count: post.comments_count,
          created_at: post.created_at,
          user_id: post.user_id,
          username: post.profiles?.username || 'Unknown',
          avatar_url: post.profiles?.avatar_url || null
        }));
        setConversations(mappedConversations);
      }
    } catch (error) {
      console.error('Failed to load top conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-2 border-primary/20">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading top conversations...</p>
        </div>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return null;
  }

  return (
    <Card className="p-8 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-2 border-primary/20 shadow-xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Top Conversations This Week
              <MessageSquare className="w-5 h-5 text-primary" />
            </h2>
            <p className="text-sm text-muted-foreground">
              Most engaged discussions from the community
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {conversations.map((conversation, index) => (
            <Card
              key={conversation.id}
              className="p-5 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 cursor-pointer"
              onClick={() => navigate(`/discussion/thread?id=${conversation.id}`)}
            >
              <div>
                <h3 className="text-xl font-bold text-foreground leading-tight mb-2">
                  {conversation.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {conversation.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {conversation.comments_count}
                    </span>
                  </div>
                </div>
              </div>

              {conversation.description && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {conversation.description}
                </p>
              )}

              <div className="pt-2 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  by {conversation.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
};