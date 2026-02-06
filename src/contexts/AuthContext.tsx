import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Simple password for the shared account
// In production, this would be handled by a backend
const SHARED_PASSWORD = 'seangela2024';

const AUTH_STORAGE_KEY = 'adventures_auth';
const FIRST_VISIT_KEY = 'adventures_first_visit';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user was previously authenticated
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored === 'true';
  });

  const [showLoginModal, setShowLoginModal] = useState(() => {
    // Show modal on first visit
    const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);
    return !hasVisited;
  });

  useEffect(() => {
    // Mark that user has visited
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
    }
  }, []);

  const login = useCallback((password: string): boolean => {
    if (password === SHARED_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      setShowLoginModal(false);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      showLoginModal,
      setShowLoginModal
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
