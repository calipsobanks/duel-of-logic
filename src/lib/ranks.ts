export interface Rank {
  name: string;
  minPoints: number;
  icon: string;
  color: string;
}

export const RANKS: Rank[] = [
  { name: "Novice Debater", minPoints: 0, icon: "🌱", color: "text-gray-500" },
  { name: "Apprentice", minPoints: 25, icon: "📖", color: "text-blue-500" },
  { name: "Skilled Debater", minPoints: 75, icon: "⚖️", color: "text-green-500" },
  { name: "Expert", minPoints: 150, icon: "🎓", color: "text-purple-500" },
  { name: "Master Debater", minPoints: 300, icon: "👑", color: "text-gold" },
  { name: "Legendary", minPoints: 500, icon: "🏆", color: "text-yellow-500" },
];

export const getRankForPoints = (points: number): Rank => {
  // Find the highest rank the user qualifies for
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return RANKS[i];
    }
  }
  return RANKS[0]; // Default to first rank
};

export const getProgressToNextRank = (points: number): { current: Rank; next: Rank | null; progress: number } => {
  const currentRank = getRankForPoints(points);
  const currentIndex = RANKS.findIndex(r => r.name === currentRank.name);
  const nextRank = currentIndex < RANKS.length - 1 ? RANKS[currentIndex + 1] : null;
  
  if (!nextRank) {
    return { current: currentRank, next: null, progress: 100 };
  }
  
  const pointsIntoCurrentRank = points - currentRank.minPoints;
  const pointsNeededForNext = nextRank.minPoints - currentRank.minPoints;
  const progress = Math.min(100, (pointsIntoCurrentRank / pointsNeededForNext) * 100);
  
  return { current: currentRank, next: nextRank, progress };
};
