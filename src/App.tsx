import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ReactionProvider } from "@/contexts/ReactionContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Discussions from "./pages/Discussions";
import DiscussionSetup from "./pages/DiscussionSetup";
import ActiveDiscussion from "./pages/ActiveDiscussion";
import PublicDiscussion from "./pages/PublicDiscussion";
import GroupDiscussion from "./pages/GroupDiscussion";
import Admin from "./pages/Admin";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setShowOnboarding(!data?.onboarding_completed);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    if (!loading) {
      checkOnboardingStatus();
    }
  }, [user, loading]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (loading || checkingOnboarding) {
    return null;
  }

  return (
    <>
      {user && (
        <OnboardingModal
          open={showOnboarding}
          userId={user.id}
          onComplete={handleOnboardingComplete}
        />
      )}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/discussions" element={<Discussions />} />
        <Route path="/discussion/setup" element={<DiscussionSetup />} />
        <Route path="/discussion/active" element={<ActiveDiscussion />} />
        <Route path="/discussion/public" element={<PublicDiscussion />} />
        <Route path="/discussion/group" element={<GroupDiscussion />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/support" element={<Support />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ReactionProvider>
              <AppContent />
            </ReactionProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
