import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, TrendingUp, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Topic {
  id: string;
  category: "Politics" | "Religion" | "Finance";
  title: string;
  question: string;
  description: string;
  controversy: string;
}

interface GroupDiscussion {
  id: string;
  topic_id: string;
  participant_count: number;
}

const categoryColors = {
  Politics: "bg-red-500/10 text-red-500 border-red-500/20",
  Religion: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Finance: "bg-green-500/10 text-green-500 border-green-500/20",
};

const categoryIcons = {
  Politics: "🏛️",
  Religion: "⛪",
  Finance: "💰",
};

export const ControversialTopics = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [groupDiscussions, setGroupDiscussions] = useState<GroupDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      // Fetch topics from database
      const { data, error } = await supabase
        .from('controversial_topics')
        .select('*')
        .order('week_start', { ascending: false })
        .order('category', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Map database topics to component Topic type
        const mappedTopics: Topic[] = data.map(t => ({
          id: t.id,
          category: t.category as "Politics" | "Religion" | "Finance",
          title: t.title,
          question: t.question || t.title,
          description: t.description,
          controversy: t.controversy
        }));
        setTopics(mappedTopics);

        // Fetch group discussions for these topics
        const topicIds = data.map(t => t.id);
        const { data: discussionsData } = await supabase
          .from('group_discussions')
          .select('id, topic_id, group_discussion_participants(count)')
          .in('topic_id', topicIds)
          .eq('status', 'active');

        if (discussionsData) {
          const discussionsWithCounts: GroupDiscussion[] = discussionsData.map((d: any) => ({
            id: d.id,
            topic_id: d.topic_id,
            participant_count: d.group_discussion_participants?.[0]?.count || 0
          }));
          setGroupDiscussions(discussionsWithCounts);
        }
      }
    } catch (error) {
      console.error('Failed to load controversial topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrJoinDiscussion = async (topicId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Check if there's an active discussion for this topic
      const existingDiscussion = groupDiscussions.find(d => d.topic_id === topicId);

      if (existingDiscussion) {
        // Join existing discussion
        navigate(`/discussion/group?id=${existingDiscussion.id}`);
      } else {
        // Create new discussion
        const { data, error } = await supabase
          .from('group_discussions')
          .insert({
            topic_id: topicId,
            created_by: user.id
          })
          .select()
          .single();

        if (error) throw error;

        toast.success('Group discussion created!');
        navigate(`/discussion/group?id=${data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating/joining discussion:', error);
      toast.error('Failed to join discussion');
    }
  };

  if (loading) {
    return (
      <Card className="p-8 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-purple-500/5 border-2 border-orange-500/20">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <p className="text-muted-foreground">Loading this week's hot topics...</p>
        </div>
      </Card>
    );
  }

  if (topics.length === 0) {
    return null;
  }

  return (
    <Card className="p-8 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-purple-500/5 border-2 border-orange-500/20 shadow-xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-orange-500/10">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Hot Topics This Week
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </h2>
            <p className="text-sm text-muted-foreground">
              Big questions everyone is talking about
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {topics.map((topic, index) => {
            const discussion = groupDiscussions.find(d => d.topic_id === topic.id);
            const participantCount = discussion?.participant_count || 0;
            
            return (
              <Card
                key={index}
                className="p-5 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2"
              >
                <div>
                  <h3 className="text-xl font-bold text-foreground leading-tight mb-2">
                    {topic.question}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`${categoryColors[topic.category]} font-semibold text-xs`}
                    >
                      {categoryIcons[topic.category]} {topic.category}
                    </Badge>
                    <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    {participantCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {participantCount} in room
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {topic.description}
                </p>

                <div className="pt-2 border-t">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-3">
                    🔥 {topic.controversy}
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleCreateOrJoinDiscussion(topic.id)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {discussion ? 'Join Conversation' : 'Start Conversation'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Card>
  );
};