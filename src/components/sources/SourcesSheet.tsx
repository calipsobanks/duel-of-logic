import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Trash2, Plus, ExternalLink, Bookmark } from "lucide-react";
import { toast } from "sonner";

interface Source {
  id: string;
  url: string;
  title: string;
  addedAt: string;
}

interface SourcesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = "debate_sources";
const MAX_SOURCES = 10;

export const SourcesSheet = ({ open, onOpenChange }: SourcesSheetProps) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (open) {
      loadSources();
    }
  }, [open]);

  const loadSources = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSources(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading sources:", error);
    }
  };

  const saveSources = (updatedSources: Source[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSources));
      setSources(updatedSources);
    } catch (error) {
      console.error("Error saving sources:", error);
      toast.error("Failed to save sources");
    }
  };

  const handleAddSource = () => {
    if (!newUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if (sources.length >= MAX_SOURCES) {
      toast.error(`Maximum ${MAX_SOURCES} sources allowed`);
      return;
    }

    const newSource: Source = {
      id: Date.now().toString(),
      url: newUrl.trim(),
      title: newTitle.trim() || "Untitled Source",
      addedAt: new Date().toISOString(),
    };

    const updatedSources = [newSource, ...sources];
    saveSources(updatedSources);
    setNewUrl("");
    setNewTitle("");
    toast.success("Source added!");
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!");
  };

  const handleDeleteSource = (id: string) => {
    const updatedSources = sources.filter((s) => s.id !== id);
    saveSources(updatedSources);
    toast.success("Source removed");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle>My Sources</SheetTitle>
            <SheetDescription>
              Store up to {MAX_SOURCES} sources for quick access. Copy URLs to paste in discussions.
            </SheetDescription>
          </SheetHeader>

          <div className="p-6 border-b space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-url">Source URL *</Label>
              <Input
                id="source-url"
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/article"
                onKeyDown={(e) => e.key === "Enter" && handleAddSource()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-title">Title (optional)</Label>
              <Input
                id="source-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Short description of this source"
                maxLength={100}
                onKeyDown={(e) => e.key === "Enter" && handleAddSource()}
              />
            </div>
            <Button 
              onClick={handleAddSource} 
              className="w-full"
              disabled={sources.length >= MAX_SOURCES || !newUrl.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Source ({sources.length}/{MAX_SOURCES})
            </Button>
          </div>

          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="mt-4 space-y-3">
              {sources.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No sources saved yet</p>
                  <p className="text-xs mt-1">Add your frequently used sources above</p>
                </div>
              ) : (
                sources.map((source) => (
                  <Card key={source.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1 truncate">{source.title}</h4>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 break-all"
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{source.url}</span>
                          </a>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyUrl(source.url)}
                            className="h-8 w-8 p-0"
                            title="Copy URL"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSource(source.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
