import { useState, useEffect, useCallback } from 'react';
import { enabledAuthMethods, getFirebaseAuth } from '@/lib/firebase-config';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser, fetchUser } from '@/lib/api';

// Storage keys
const USER_STORAGE_KEY = '@ezypzy_user';

// Custom user type for backend auth
interface BackendUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  login_method?: string;
  is_business_user?: boolean;
}

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useBackendAuth, setUseBackendAuth] = useState(false);

  // Load stored user on mount
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setBackendUser(JSON.parse(stored));
          setUseBackendAuth(true);
        }
      } catch (e) {
        console.log('Error loading stored user:', e);
      }
    };
    loadStoredUser();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initAuth = async () => {
      try {
        const auth = getFirebaseAuth();
        if (auth) {
          unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setFirebaseUser(currentUser);
            setLoading(false);
          });
        } else {
          // Firebase not available, use backend auth
          setUseBackendAuth(true);
          setLoading(false);
        }
      } catch (e) {
        console.log('Auth init error, using backend:', e);
        setUseBackendAuth(true);
        setLoading(false);
      }
    };
    
    initAuth();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    
    // Try Firebase first
    const auth = getFirebaseAuth();
    if (auth && !useBackendAuth) {
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
      } catch (err: any) {
        console.log('Firebase sign in error:', err.code);
        // If Firebase fails, try backend
      }
    }
    
    // Fallback to backend auth
    try {
      const user = await loginUser(email, password);
      setBackendUser(user);
      setUseBackendAuth(true);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch (err: any) {
      const message = err.message || 'Invalid email or password';
      setError(message);
      throw { code: 'auth/invalid-credential', message };
    }
  }, [useBackendAuth]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    setError(null);
    
    // Try Firebase first
    const auth = getFirebaseAuth();
    if (auth && !useBackendAuth) {
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Also create in backend
        try {
          await registerUser(name || email.split('@')[0], email, password);
        } catch (e) {
          console.log('Backend user creation failed:', e);
        }
        return result.user;
      } catch (err: any) {
        console.log('Firebase sign up error:', err.code);
        // If Firebase fails, try backend
      }
    }
    
    // Fallback to backend auth
    try {
      const user = await registerUser(name || email.split('@')[0], email, password);
      setBackendUser(user);
      setUseBackendAuth(true);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch (err: any) {
      const message = err.message || 'Registration failed';
      setError(message);
      throw { code: 'auth/operation-not-allowed', message };
    }
  }, [useBackendAuth]);

  const signOut = useCallback(async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.log('Firebase sign out error:', e);
    }
    
    // Clear backend user
    setBackendUser(null);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Password reset requires Firebase authentication');
    }
    
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Combined user object
  const user = firebaseUser || (backendUser ? {
    uid: String(backendUser.id),
    email: backendUser.email,
    displayName: backendUser.name,
    photoURL: backendUser.avatar_url,
    ...backendUser
  } : null);

  return {
    user,
    backendUser,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    enabledAuthMethods,
    isBackendAuth: useBackendAuth,
  };
}
