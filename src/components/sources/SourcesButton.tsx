import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SourcesSheet } from "./SourcesSheet";
import { useAuth } from "@/contexts/AuthContext";

export const SourcesButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-36 right-4 h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-all duration-300 animate-fade-in"
        title="My Sources"
      >
        <Bookmark className="h-5 w-5" />
      </Button>
      <SourcesSheet open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
