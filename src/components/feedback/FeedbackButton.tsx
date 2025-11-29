import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SubmitFeedbackDialog } from "./SubmitFeedbackDialog";
import { useAuth } from "@/contexts/AuthContext";

export const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform"
        title="Submit Feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </Button>
      <SubmitFeedbackDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
