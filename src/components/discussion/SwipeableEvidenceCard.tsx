import { useState, ReactNode } from "react";
import { useSwipeable } from "react-swipeable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, X, ChevronLeft, ChevronRight } from "lucide-react";

interface SwipeableEvidenceCardProps {
  children: ReactNode;
  canSwipe: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  rightLabel?: string;
  leftLabel?: string;
}

export const SwipeableEvidenceCard = ({
  children,
  canSwipe,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "Agree",
  leftLabel = "Challenge",
}: SwipeableEvidenceCardProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const threshold = 100;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (!canSwipe) return;
      setIsSwiping(true);
      setSwipeOffset(e.deltaX);
    },
    onSwipedRight: () => {
      if (!canSwipe) return;
      if (swipeOffset > threshold) {
        onSwipeRight();
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onSwipedLeft: () => {
      if (!canSwipe) return;
      if (swipeOffset < -threshold) {
        onSwipeLeft();
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onTouchEndOrOnMouseUp: () => {
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    trackMouse: true,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const getBackgroundColor = () => {
    if (!isSwiping || !canSwipe) return "transparent";
    if (swipeOffset > 30) return `rgba(34, 197, 94, ${Math.min(swipeOffset / 200, 0.3)})`;
    if (swipeOffset < -30) return `rgba(239, 68, 68, ${Math.min(Math.abs(swipeOffset) / 200, 0.3)})`;
    return "transparent";
  };

  const showRightIndicator = canSwipe && swipeOffset > 30;
  const showLeftIndicator = canSwipe && swipeOffset < -30;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background indicators */}
      <div 
        className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none"
        style={{ backgroundColor: getBackgroundColor() }}
      >
        <div className={`flex items-center gap-2 text-destructive transition-opacity ${showLeftIndicator ? 'opacity-100' : 'opacity-0'}`}>
          <X className="w-6 h-6" />
          <span className="font-semibold">{leftLabel}</span>
        </div>
        <div className={`flex items-center gap-2 text-green-600 transition-opacity ${showRightIndicator ? 'opacity-100' : 'opacity-0'}`}>
          <span className="font-semibold">{rightLabel}</span>
          <CheckCircle className="w-6 h-6" />
        </div>
      </div>

      {/* Swipeable card */}
      <div
        {...handlers}
        style={{
          transform: canSwipe ? `translateX(${swipeOffset * 0.5}px)` : 'none',
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
        className={canSwipe ? "cursor-grab active:cursor-grabbing" : ""}
      >
        {children}
      </div>

      {/* Swipe hint for swipeable cards */}
      {canSwipe && !isSwiping && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-3 py-1 rounded-full border">
          <ChevronLeft className="w-3 h-3" />
          <span>Swipe to respond</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};
