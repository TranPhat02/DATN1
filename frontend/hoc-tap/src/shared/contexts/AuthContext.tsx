/**
 * AuthContext — TN Education Platform
 * Manages JWT authentication state, login/logout, and role-based access.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../../api/authApi';
import { STORAGE_KEYS, ROUTES, ROLES } from '../utils/constants';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseToken(token: string): { sub: string; role: string; exp: number } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // ── Restore session from localStorage ──
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (token && userStr) {
      try {
        const parsed = JSON.parse(userStr) as AuthUser;
        const decoded = parseToken(token);
        // Check if token is expired
        if (decoded && decoded.exp * 1000 > Date.now()) {
          setUser({ ...parsed, token });
        } else {
          // Token expired, clear storage
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginApi(username, password);
    const authUser: AuthUser = {
      username: data.username,
      role: data.role as AuthUser['role'],
      token: data.access_token,
    };

    localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));
    setUser(authUser);

    // Redirect based on role
    switch (data.role) {
      case ROLES.ADMIN:
        navigate(ROUTES.ADMIN);
        break;
      case ROLES.TEACHER:
        navigate(ROUTES.TEACHER);
        break;
      case ROLES.STUDENT:
        navigate(ROUTES.STUDENT);
        break;
      default:
        navigate(ROUTES.LOGIN);
    }
  }, [navigate]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    navigate(ROUTES.LOGIN);
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
