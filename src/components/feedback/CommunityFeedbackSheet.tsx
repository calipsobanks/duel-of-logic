import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { User, CheckCircle2, Clock, CircleDot, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeedbackItem {
  id: string;
  user_id: string;
  content: string;
  category: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommunityFeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  in_progress: { label: "In Progress", icon: CircleDot, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  implemented: { label: "Implemented", icon: CheckCircle2, color: "bg-green-500/10 text-green-500 border-green-500/20" },
  declined: { label: "Declined", icon: XCircle, color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

const categoryEmojis = {
  bug: "🐛",
  feature: "✨",
  improvement: "🚀",
  general: "💬",
};

export const CommunityFeedbackSheet = ({ open, onOpenChange }: CommunityFeedbackSheetProps) => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (open) {
      fetchFeedback();
    }
  }, [open]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      // First get all feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (feedbackError) throw feedbackError;

      // Then get the profiles for those user IDs
      const userIds = feedbackData?.map((f) => f.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
      const combinedData = feedbackData?.map((f) => ({
        ...f,
        profiles: profilesMap.get(f.user_id) || { username: "Unknown", avatar_url: null },
      })) || [];

      setFeedback(combinedData);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedback = feedback.filter((item) => 
    filter === "all" ? true : item.status === filter
  );

  const FeedbackCard = ({ item }: { item: FeedbackItem }) => {
    const statusInfo = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = statusInfo.icon;

    return (
      <Card className="mb-3">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={item.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  @{item.profiles?.username || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Badge variant="outline" className="text-xs">
                {categoryEmojis[item.category as keyof typeof categoryEmojis]} {item.category}
              </Badge>
              <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm whitespace-pre-wrap">{item.content}</p>
          {item.admin_response && (
            <div className="mt-3 p-3 bg-muted/50 rounded-md border">
              <p className="text-xs font-medium text-primary mb-1">Admin Response:</p>
              <p className="text-xs text-muted-foreground">{item.admin_response}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle>Community Feedback</SheetTitle>
            <SheetDescription>
              See what the community is suggesting and what's been implemented
            </SheetDescription>
          </SheetHeader>

          <Tabs value={filter} onValueChange={setFilter} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs">In Progress</TabsTrigger>
              <TabsTrigger value="implemented" className="text-xs">Implemented</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6 pb-6">
              <TabsContent value={filter} className="mt-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading feedback...
                  </div>
                ) : filteredFeedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No feedback found
                  </div>
                ) : (
                  filteredFeedback.map((item) => (
                    <FeedbackCard key={item.id} item={item} />
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
