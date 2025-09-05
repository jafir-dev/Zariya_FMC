import { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';
import { firebaseAuth as auth, firebaseDb as db } from '@/lib/firebaseAuth';
import type { User } from '@shared/schema';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  fmcOrganizationId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Get initial session and handle redirect result
    const getInitialSession = async () => {
      try {
        // First check for redirect result (Google Sign-in)
        const redirectResult = await auth.handleRedirectResult();
        
        if (redirectResult && redirectResult.user) {
          // Handle successful Google Sign-in redirect
          const { data: userData } = await db.getUser(redirectResult.user.uid);
          
          if (userData) {
            setUser({
              id: userData.id,
              email: userData.email || '',
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              fmcOrganizationId: userData.fmcOrganizationId,
            });
            setIsAuthenticated(true);
          }
        } else {
          // Check for existing session
          const { user: authUser } = await auth.getCurrentUser();
          
          if (authUser) {
            // Get user data from our database
            const { data: userData } = await db.getUser(authUser.uid);
            
            if (userData) {
              setUser({
                id: userData.id,
                email: userData.email || '',
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                fmcOrganizationId: userData.fmcOrganizationId,
              });
              setIsAuthenticated(true);
            }
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: userData } = await db.getUser(session.user.id);
          if (userData) {
            setUser({
              id: userData.id,
              email: userData.email || '',
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              fmcOrganizationId: userData.fmcOrganizationId,
            });
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await auth.signIn(email, password);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await auth.signInWithGoogle();
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { error } = await auth.signUp(email, password, userData);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
  };
}
