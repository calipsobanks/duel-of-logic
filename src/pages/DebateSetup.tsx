import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ChevronRight } from "lucide-react";

type ReasoningType = "inductive" | "deductive" | null;

const DebateSetup = () => {
  const navigate = useNavigate();
  const [debater1Name, setDebater1Name] = useState("");
  const [debater2Name, setDebater2Name] = useState("");
  const [topic, setTopic] = useState("");
  const [reasoningType, setReasoningType] = useState<ReasoningType>(null);

  const handleStartDebate = () => {
    if (debater1Name && debater2Name && topic && reasoningType) {
      // Store debate setup in localStorage for now
      localStorage.setItem('debateSetup', JSON.stringify({
        debater1Name,
        debater2Name,
        topic,
        reasoningType
      }));
      navigate('/debate/active');
    }
  };

  const isFormValid = debater1Name && debater2Name && topic && reasoningType;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-debate-blue-light py-12">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Set Up Your Debate
            </h1>
            <p className="text-lg text-muted-foreground">
              Configure the participants and reasoning framework for your debate
            </p>
          </div>

          <Card className="p-8 space-y-8">
            {/* Debater Names */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="debater1" className="text-base font-semibold">
                  Debater 1 Name
                </Label>
                <Input
                  id="debater1"
                  placeholder="Enter first debater's name"
                  value={debater1Name}
                  onChange={(e) => setDebater1Name(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="debater2" className="text-base font-semibold">
                  Debater 2 Name
                </Label>
                <Input
                  id="debater2"
                  placeholder="Enter second debater's name"
                  value={debater2Name}
                  onChange={(e) => setDebater2Name(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic" className="text-base font-semibold">
                  Debate Topic
                </Label>
                <Input
                  id="topic"
                  placeholder="What will you debate about?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="text-lg"
                />
              </div>
            </div>

            {/* Reasoning Type Selection */}
            <div className="space-y-4 pt-6 border-t">
              <Label className="text-base font-semibold">
                Select Reasoning Framework
              </Label>
              <RadioGroup
                value={reasoningType || ""}
                onValueChange={(value) => setReasoningType(value as ReasoningType)}
                className="space-y-4"
              >
                <Card className={`p-6 cursor-pointer transition-all ${
                  reasoningType === 'inductive' 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}>
                  <div className="flex items-start space-x-4">
                    <RadioGroupItem value="inductive" id="inductive" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="inductive" className="text-lg font-semibold cursor-pointer">
                        Inductive Reasoning
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Start with specific observations and move toward general conclusions. 
                        Build arguments from patterns, examples, and empirical evidence.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className={`p-6 cursor-pointer transition-all ${
                  reasoningType === 'deductive' 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}>
                  <div className="flex items-start space-x-4">
                    <RadioGroupItem value="deductive" id="deductive" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="deductive" className="text-lg font-semibold cursor-pointer">
                        Deductive Reasoning
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Start with general principles and move toward specific conclusions. 
                        Build arguments from established premises to logical outcomes.
                      </p>
                    </div>
                  </div>
                </Card>
              </RadioGroup>
            </div>

            <Button
              size="lg"
              className="w-full text-lg"
              disabled={!isFormValid}
              onClick={handleStartDebate}
            >
              Start Debate
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DebateSetup;
