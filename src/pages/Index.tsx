import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Brain, Scale, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ControversialTopics } from "@/components/ControversialTopics";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  useAnalytics();

  useEffect(() => {
    if (!loading && user) {
      navigate('/discussions');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-discussion-blue-light">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Scale className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-6xl font-bold text-foreground tracking-tight">
            Evidence-Based<br />
            <span className="text-primary">Discussion Platform</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Structure your arguments with logical reasoning frameworks. 
            Validate sources collaboratively. Elevate discourse.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={() => navigate('/auth')}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8"
            >
              Learn How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 space-y-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              Reasoning Framework
            </h3>
            <p className="text-muted-foreground">
              Choose between inductive or deductive reasoning to structure your argument logically.
            </p>
          </Card>

          <Card className="p-6 space-y-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              Source Validation
            </h3>
            <p className="text-muted-foreground">
              Classify sources as factual or opinionated. Both parties must agree to proceed.
            </p>
          </Card>

          <Card className="p-6 space-y-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="w-12 h-12 rounded-lg bg-discussion-success/10 flex items-center justify-center">
              <Scale className="w-6 h-6 text-discussion-success" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              Mutual Agreement
            </h3>
            <p className="text-muted-foreground">
              Progress only when both participants acknowledge the validity of evidence.
            </p>
          </Card>

          <Card className="p-6 space-y-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="w-12 h-12 rounded-lg bg-discussion-warning/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-discussion-warning" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              Challenge Evidence
            </h3>
            <p className="text-muted-foreground">
              Counter with additional sources to prove or disprove presented evidence.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-4xl font-bold text-center text-foreground">
            How It Works
          </h2>
          
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Choose Your Reasoning",
                description: "Select whether you'll use inductive (specific to general) or deductive (general to specific) reasoning."
              },
              {
                step: "2",
                title: "Present Evidence",
                description: "Submit supporting evidence one at a time, marking each source as factual or opinionated."
              },
              {
                step: "3",
                title: "Validate Together",
                description: "Both participants review and agree on the validity of each piece of evidence before moving forward."
              },
              {
                step: "4",
                title: "Challenge & Counter",
                description: "Question evidence by providing additional sources to support or refute claims."
              }
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  {item.step}
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-2xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Controversial Topics Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <ControversialTopics />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto p-12 text-center space-y-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <h2 className="text-4xl font-bold">
            Ready to Elevate Your Discussions?
          </h2>
          <p className="text-xl opacity-90">
            Start building stronger arguments with evidence-based reasoning.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8"
            onClick={() => navigate('/auth')}
          >
            Join Now
          </Button>
        </Card>
      </section>
    </div>
  );
};

export default Index;
