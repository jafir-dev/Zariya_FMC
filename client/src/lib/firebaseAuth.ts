import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export interface AuthError {
  message: string;
}

export interface AuthResult {
  user?: FirebaseUser | null;
  error?: AuthError | null;
}

// Firebase Auth adapter with same interface as Supabase
export const firebaseAuth = {
  getCurrentUser: async (): Promise<{ user: FirebaseUser | null }> => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve({ user });
      });
    });
  },

  signUp: async (email: string, password: string, userData: any): Promise<{ error?: AuthError }> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in our database
      const response = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: result.user.uid,
          email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'tenant',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user profile');
      }

      return {};
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  },

  signIn: async (email: string, password: string): Promise<{ error?: AuthError }> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  },

  signInWithGoogle: async (): Promise<{ error?: AuthError }> => {
    try {
      await signInWithRedirect(auth, googleProvider);
      return {}; // Redirect will handle the rest
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  },

  handleRedirectResult: async (): Promise<{ user?: FirebaseUser | null, error?: AuthError }> => {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        // Check if user profile exists, create if not
        const response = await fetch(`/api/auth/profile/${result.user.uid}`);
        if (!response.ok) {
          // Create profile for new Google user
          await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: result.user.uid,
              email: result.user.email,
              firstName: result.user.displayName?.split(' ')[0] || '',
              lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
              role: 'tenant',
            }),
          });
        }
        return { user: result.user };
      }
      return { user: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  },

  signOut: async (): Promise<{ error?: AuthError }> => {
    try {
      await firebaseSignOut(auth);
      return {};
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  },

  onAuthStateChange: (callback: (event: string, session: { user: FirebaseUser } | null) => void) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        callback('SIGNED_IN', { user });
      } else {
        callback('SIGNED_OUT', null);
      }
    });

    return {
      data: {
        subscription: {
          unsubscribe
        }
      }
    };
  }
};

// Database adapter for user profiles
export const firebaseDb = {
  getUser: async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/profile/${userId}`);
      
      if (!response.ok) {
        throw new Error('User not found');
      }
      const userData = await response.json();
      return { data: userData, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
};