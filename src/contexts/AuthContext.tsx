import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, username: string) => Promise<void>;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, username: string) => {
    // Use email as password for simplicity
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: email, // Using email as password for instant access
      options: {
        emailRedirectTo: `${window.location.origin}/discussions`,
        data: {
          username
        }
      }
    });

    if (signUpError) {
      // If user already exists, try to sign in instead
      if (signUpError.message.includes('already registered')) {
        toast.error('Account already exists. Trying to log you in...');
        return signIn(email);
      }
      toast.error(signUpError.message);
      throw signUpError;
    }

    // If email confirmation is disabled, user will be logged in immediately
    // If enabled, they need to check email
    if (data.user && data.session) {
      toast.success('Welcome! You\'re all set.');
      navigate('/discussions');
    } else {
      toast.info('Please check your email to confirm your account, then try logging in.');
    }
  };

  const signIn = async (email: string) => {
    // Try to sign in with email as password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: email, // Using email as password
    });

    if (error) {
      // If login fails, suggest signing up
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Account not found or password mismatch. Please sign up first or check that email confirmation is disabled in Supabase settings.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please confirm your email first. Check your inbox for a confirmation link.');
      } else {
        toast.error(error.message);
      }
      throw error;
    }

    if (data.session) {
      toast.success('Welcome back!');
      navigate('/discussions');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // If the session is already invalid, we still want to clear local state
      if (error && !error.message.includes('Session not found')) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Always clear local state and navigate, regardless of server response
      setSession(null);
      setUser(null);
      toast.success('Signed out successfully');
      navigate('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};