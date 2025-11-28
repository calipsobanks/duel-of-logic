import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Topic {
  category: "Politics" | "Religion" | "Finance";
  title: string;
  description: string;
  controversy: string;
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      // Fetch topics from database instead of calling edge function
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
          category: t.category as "Politics" | "Religion" | "Finance",
          title: t.title,
          description: t.description,
          controversy: t.controversy
        }));
        setTopics(mappedTopics);
      }
    } catch (error) {
      console.error('Failed to load controversial topics:', error);
    } finally {
      setLoading(false);
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
          {topics.map((topic, index) => (
            <Card
              key={index}
              className="p-5 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2"
              onClick={() => navigate('/auth')}
            >
              <h3 className="text-lg font-bold text-foreground leading-tight">
                {topic.title}
              </h3>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${categoryColors[topic.category]} font-semibold text-xs`}
                >
                  {categoryIcons[topic.category]} {topic.category}
                </Badge>
                <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {topic.description}
              </p>

              <div className="pt-2 border-t">
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  🔥 {topic.controversy}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Button
            size="lg"
            onClick={() => {
              navigate('/discussions');
              // Use setTimeout to ensure navigation completes before changing tab
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('change-tab', { detail: 'members' }));
              }, 100);
            }}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
          >
            Join the Conversation
          </Button>
        </div>
      </div>
    </Card>
  );
};