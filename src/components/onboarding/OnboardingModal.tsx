import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Lightbulb, Trophy, Zap, Star, Award, Heart, DollarSign } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  userId: string;
  onComplete: () => void;
}

type Step = "welcome" | "assessment" | "question1" | "question2" | "rules" | "support" | "complete";

const OnboardingModal = ({ open, userId, onComplete }: OnboardingModalProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);

  const questions = [
    {
      id: "q1",
      type: "Deductive Reasoning",
      question: "All mammals have lungs. A whale is a mammal. Therefore...",
      options: [
        { id: "a", text: "A whale might have lungs", correct: false },
        { id: "b", text: "A whale has lungs", correct: true },
        { id: "c", text: "A whale could have gills instead", correct: false },
        { id: "d", text: "We need more data to conclude", correct: false },
      ],
      explanation: "This is deductive reasoning. When you start with a general rule (all mammals have lungs) and apply it to a specific case (whale is a mammal), you can draw a definite conclusion. The conclusion logically follows from the premises with 100% certainty.",
      educationalNote: "Deductive reasoning moves from general to specific. If your premises are true, your conclusion must be true. It's like a logical guarantee.",
    },
    {
      id: "q2",
      type: "Inductive Reasoning",
      question: "The sun has risen every day for billions of years. Based on this pattern...",
      options: [
        { id: "a", text: "The sun will definitely rise tomorrow", correct: false },
        { id: "b", text: "The sun will probably rise tomorrow", correct: true },
        { id: "c", text: "We can't predict anything about the sun", correct: false },
        { id: "d", text: "The sun will never set again", correct: false },
      ],
      explanation: "This is inductive reasoning. You observe a pattern (sun rising daily) and make a probable prediction about the future. Unlike deductive reasoning, your conclusion is likely but not guaranteed - there's a small chance something could change.",
      educationalNote: "Inductive reasoning moves from specific observations to general conclusions. It creates strong probability but not absolute certainty. Most scientific theories are built on inductive reasoning.",
    },
  ];

  const currentQuestion = step === "question1" ? questions[0] : questions[1];

  const handleAnswerSelect = (answerId: string) => {
    setSelectedAnswer(answerId);
    setShowExplanation(false);
  };

  const handleCheckAnswer = () => {
    const correct = currentQuestion.options.find(opt => opt.id === selectedAnswer)?.correct || false;
    setIsCorrect(correct);
    setShowExplanation(true);
  };

  const handleAssessmentContinue = async () => {
    if (confidenceLevel === 5) {
      // They're confident, skip the test
      await handleComplete();
    } else {
      // They need the onboarding
      setStep("question1");
    }
  };

  const handleNext = () => {
    if (step === "question1") {
      setStep("question2");
      setSelectedAnswer("");
      setShowExplanation(false);
    } else if (step === "question2") {
      setStep("rules");
    }
  };

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);

      if (error) throw error;

      setStep("complete");
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to save onboarding progress");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "welcome" && (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Welcome to Evidence-Based Discussions! 🎯</h2>
              <p className="text-lg text-muted-foreground">
                Before you start, let's make sure you understand the core reasoning methods we use here.
              </p>
            </div>

            <Card className="p-6 space-y-4 bg-muted/30">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                What You'll Learn
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">1.</span>
                  <span><strong>Deductive Reasoning:</strong> Drawing certain conclusions from general rules</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">2.</span>
                  <span><strong>Inductive Reasoning:</strong> Making probable predictions from patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">3.</span>
                  <span><strong>How to use evidence:</strong> Supporting your arguments with reliable sources</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">4.</span>
                  <span><strong>How to play:</strong> Learn the debate flow, point system, and ranking system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">5.</span>
                  <span><strong>How to support:</strong> Ways to help keep this app free for everyone</span>
                </li>
              </ul>
            </Card>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This quick test takes less than 2 minutes. We'll teach you as we go!
              </p>
            </div>

            <Button onClick={() => setStep("assessment")} className="w-full" size="lg">
              Continue
            </Button>
          </div>
        )}

        {step === "assessment" && (
          <div className="space-y-6 py-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Quick Self-Assessment</h2>
              <p className="text-muted-foreground">
                On a scale of 1 to 5, how well do you understand deductive and inductive reasoning?
              </p>
            </div>

            <Card className="p-6 space-y-4 bg-muted/30">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Not at all</span>
                  <span>Expert level</span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setConfidenceLevel(level)}
                      className={`aspect-square rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 hover:scale-105 ${
                        confidenceLevel === level
                          ? "border-primary bg-primary/20 scale-105"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-2xl font-bold">{level}</span>
                      <span className="text-xs text-muted-foreground">
                        {level === 1 && "Beginner"}
                        {level === 2 && "Novice"}
                        {level === 3 && "Intermediate"}
                        {level === 4 && "Advanced"}
                        {level === 5 && "Expert"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {confidenceLevel && confidenceLevel < 5 && (
              <Card className="p-4 bg-blue-500/10 border-blue-500">
                <p className="text-sm flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Great! We'll walk you through a quick crash course to strengthen your understanding.
                  </span>
                </p>
              </Card>
            )}

            {confidenceLevel === 5 && (
              <Card className="p-4 bg-green-500/10 border-green-500">
                <p className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Excellent! You're ready to start discussing right away.
                  </span>
                </p>
              </Card>
            )}

            <Button
              onClick={handleAssessmentContinue}
              disabled={!confidenceLevel}
              className="w-full"
              size="lg"
            >
              {confidenceLevel === 5 ? "Start Discussing" : "Start Learning"}
            </Button>
          </div>
        )}

        {(step === "question1" || step === "question2") && (
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Question {step === "question1" ? "1" : "2"} of 2
                </span>
                <span className="text-sm font-semibold text-primary">
                  {currentQuestion.type}
                </span>
              </div>
              <h3 className="text-xl font-bold">{currentQuestion.question}</h3>
            </div>

            <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect}>
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <Card
                    key={option.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedAnswer === option.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50"
                    } ${
                      showExplanation && option.correct
                        ? "border-green-500 bg-green-500/10"
                        : showExplanation && selectedAnswer === option.id && !option.correct
                        ? "border-destructive bg-destructive/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.text}
                      </Label>
                      {showExplanation && option.correct && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {showExplanation && selectedAnswer === option.id && !option.correct && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>

            {showExplanation && (
              <Card className={`p-4 ${isCorrect ? "bg-green-500/10 border-green-500" : "bg-blue-500/10 border-blue-500"}`}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <h4 className="font-semibold text-green-700 dark:text-green-400">Perfect! You got it right!</h4>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-5 w-5 text-blue-500" />
                        <h4 className="font-semibold text-blue-700 dark:text-blue-400">Let's learn together!</h4>
                      </>
                    )}
                  </div>
                  <p className="text-sm">{currentQuestion.explanation}</p>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium">💡 Key Insight:</p>
                    <p className="text-sm text-muted-foreground">{currentQuestion.educationalNote}</p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-3">
              {!showExplanation ? (
                <Button
                  onClick={handleCheckAnswer}
                  disabled={!selectedAnswer}
                  className="w-full"
                  size="lg"
                >
                  Check Answer
                </Button>
              ) : (
                <Button onClick={handleNext} className="w-full" size="lg">
                  {step === "question1" ? "Next Question" : "Continue"}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "rules" && (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">How the App Works 🎮</h2>
              <p className="text-sm text-muted-foreground">
                Learn the rules and point system to become a master debater!
              </p>
            </div>

            {/* How It Works - 3 Step Flow */}
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                The Debate Flow
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-semibold text-sm">Add Evidence</p>
                    <p className="text-xs text-muted-foreground">Present claims with reliable sources</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-semibold text-sm">React & Respond</p>
                    <p className="text-xs text-muted-foreground">Agree, Challenge, or Request Sources</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-semibold text-sm">Earn Points & Rank Up</p>
                    <p className="text-xs text-muted-foreground">Build your reputation through quality arguments</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Point System */}
            <Card className="p-4 bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Point System
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-background rounded">
                  <span className="text-xs">📝 Evidence Submitted</span>
                  <Badge variant="secondary" className="text-xs">+1</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-background rounded">
                  <span className="text-xs">✅ Evidence Agreed</span>
                  <Badge variant="secondary" className="text-xs">+2</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-500/10 rounded border border-green-500/20">
                  <span className="text-xs">🔗 Sourced Evidence Bonus</span>
                  <Badge className="text-xs bg-green-600">+2</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gold/10 rounded border border-gold/20">
                  <span className="text-xs">⭐ High-Quality Source (4-5★)</span>
                  <Badge className="text-xs bg-gold text-gold-foreground">+3</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-background rounded">
                  <span className="text-xs">🛡️ Survives Challenge</span>
                  <Badge variant="secondary" className="text-xs">+5</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-background rounded">
                  <span className="text-xs">⚔️ Successful Challenge</span>
                  <Badge variant="secondary" className="text-xs">+3</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <span className="text-xs">🏃 Quick Response (&lt;1hr)</span>
                  <Badge className="text-xs bg-blue-600">+1</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded border border-purple-500/20">
                  <span className="text-xs">🥇 First Evidence</span>
                  <Badge className="text-xs bg-purple-600">+2</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-primary/10 rounded border border-primary/20">
                  <span className="text-xs">👑 Opponent Admits Defeat</span>
                  <Badge className="text-xs bg-primary">+15</Badge>
                </div>
              </div>
            </Card>

            {/* Ranks Preview */}
            <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Rank Up Your Status
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                  <span className="text-base">🌱</span>
                  <span className="text-xs flex-1">Novice Debater</span>
                  <span className="text-xs text-muted-foreground">0+ pts</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                  <span className="text-base">📖</span>
                  <span className="text-xs flex-1">Apprentice</span>
                  <span className="text-xs text-muted-foreground">25+ pts</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                  <span className="text-base">⚖️</span>
                  <span className="text-xs flex-1">Skilled Debater</span>
                  <span className="text-xs text-muted-foreground">75+ pts</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                  <span className="text-base">🎓</span>
                  <span className="text-xs flex-1">Expert</span>
                  <span className="text-xs text-muted-foreground">150+ pts</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gold/20 rounded border border-gold/30">
                  <span className="text-base">👑</span>
                  <span className="text-xs flex-1 font-semibold">Master Debater</span>
                  <span className="text-xs text-muted-foreground">300+ pts</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-yellow-500/20 rounded border border-yellow-500/30">
                  <span className="text-base">🏆</span>
                  <span className="text-xs flex-1 font-semibold">Legendary</span>
                  <span className="text-xs text-muted-foreground">500+ pts</span>
                </div>
              </div>
            </Card>

            <Button onClick={() => setStep("support")} className="w-full" size="lg">
              Continue
            </Button>
          </div>
        )}

        {step === "support" && (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Help Keep This App Free! 💛</h2>
              <p className="text-sm text-muted-foreground">
                Your support keeps debates flowing and the app completely free for everyone
              </p>
            </div>

            {/* Affiliate Earnings Card */}
            <Card className="p-6 space-y-4 bg-gradient-to-br from-gold/20 to-yellow-500/10 border-gold/30">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Earn $100 - $5,000</h3>
                  <Badge className="bg-gold text-gold-foreground mb-3">No Gimmicks. 100% Legal.</Badge>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <p className="font-medium">Use our affiliate links to sign up for legitimate services:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-0.5">•</span>
                    <span>Open high-yield savings accounts with bonuses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-0.5">•</span>
                    <span>Start investing with sign-up rewards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-0.5">•</span>
                    <span>Get banking bonuses for new accounts</span>
                  </li>
                </ul>
                <div className="pt-3 border-t border-gold/20">
                  <p className="font-semibold text-gold">Win-Win! 🎉</p>
                  <p className="text-muted-foreground">
                    You earn real money. We get a small commission. Everyone benefits!
                  </p>
                </div>
              </div>
            </Card>

            {/* Direct Donations Card */}
            <Card className="p-4 bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold">Direct Donations</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Prefer to support directly? One-time donations are always welcome and appreciated!
              </p>
            </Card>

            {/* Call-to-Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button 
                onClick={async () => {
                  await handleComplete();
                  navigate("/support");
                }}
                className="w-full bg-gold hover:bg-gold/90 text-gold-foreground"
                size="lg"
              >
                <Star className="h-4 w-4 mr-2" />
                Learn More & Support
              </Button>
              <Button 
                onClick={handleComplete}
                variant="ghost"
                className="w-full"
                size="lg"
              >
                Continue Without Supporting
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              No pressure! You can always support us later from the menu.
            </p>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-6 py-12 text-center">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">You're All Set! 🎉</h2>
              <p className="text-muted-foreground">
                You now understand the reasoning methods we use. Let's start having meaningful discussions!
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;