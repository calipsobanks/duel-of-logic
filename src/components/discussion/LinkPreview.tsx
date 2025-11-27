import { useState, useEffect } from "react";
import { ExternalLink, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkPreviewProps {
  url: string;
  className?: string;
}

export const LinkPreview = ({ url, className = "" }: LinkPreviewProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!url) {
      setIsLoading(false);
      return;
    }

    // Use microlink.io for free link previews/screenshots
    const encodedUrl = encodeURIComponent(url);
    const screenshotUrl = `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url`;
    
    fetch(screenshotUrl)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.data?.screenshot?.url) {
          setThumbnailUrl(data.data.screenshot.url);
        } else {
          setHasError(true);
        }
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [url]);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
        <Skeleton className="w-full h-32" />
        <div className="p-2 bg-muted/30">
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (hasError || !thumbnailUrl) {
    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer ${className}`}
      >
        <div className="w-full h-24 bg-muted/50 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="p-2 bg-muted/30 flex items-center gap-2">
          <ExternalLink className="w-3 h-3 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {new URL(url).hostname}
          </span>
        </div>
      </a>
    );
  }

  return (
    <button 
      onClick={handleClick}
      className={`block w-full text-left rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer ${className}`}
    >
      <div className="relative w-full h-32 bg-muted">
        <img 
          src={thumbnailUrl} 
          alt="Source preview"
          className="w-full h-full object-cover object-top"
          onError={() => setHasError(true)}
        />
      </div>
      <div className="p-2 bg-muted/30 flex items-center gap-2">
        <ExternalLink className="w-3 h-3 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground truncate">
          {new URL(url).hostname}
        </span>
      </div>
    </button>
  );
};
