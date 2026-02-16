// AuthContext.tsx
import axios from "axios";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";

interface AuthContextType {
  authorized: boolean;
  isProfileCompleted: boolean;
  loading: boolean;
  userId: number | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  checkProfileCompletion: () => Promise<void>;
  setIsProfileCompleted: (completed: boolean) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authorized, setAuthorized] = useState<boolean>(
    !!localStorage.getItem("token"),
  );
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );

  // Fetch user ID from backend
  const fetchUserId = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUserId(null);
      return;
    }

    try {
      const response = await axios.get("http://localhost:8080/meid", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserId(response.data);
    } catch (error) {
      setUserId(null);
    }
  }, []);

  // Check profile completion status
  const checkProfileCompletion = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsProfileCompleted(true); // No auth, no check needed
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        "http://localhost:8080/users/confirmed",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Handle different response formats
      let isCompleted: boolean;

      if (typeof response.data === "boolean") {
        isCompleted = response.data;
      } else if (typeof response.data === "object" && response.data !== null) {
        isCompleted =
          response.data.isConfirmed ?? response.data.isCompleted ?? true;
      } else {
        isCompleted = true;
      }
      setIsProfileCompleted(isCompleted);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          setAuthorized(false);
          setIsProfileCompleted(true);
        } else {
          setIsProfileCompleted(true);
        }
      } else {
        setIsProfileCompleted(true);
      }
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed since we read from localStorage directly

  // Initial check on mount and retry mechanism
  useEffect(() => {
    checkProfileCompletion();
    if (authorized) {
      fetchUserId();
    }
  }, [checkProfileCompletion, fetchUserId, authorized]);

  // Retry fetching userId if authorized but missing (e.g. backend was down)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (authorized && userId === null) {
      intervalId = setInterval(() => {
        fetchUserId();
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [authorized, userId, fetchUserId]);

  // Sync state with localStorage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        const hasToken = !!e.newValue;
        setAuthorized(hasToken);

        // Re-check profile when token changes
        if (hasToken) {
          setLoading(true);
          checkProfileCompletion();
        } else {
          setIsProfileCompleted(true);
          setLoading(false);
        }
      }
    };

    // Listen for storage changes from other tabs
    window.addEventListener("storage", handleStorageChange);

    // Also periodically check localStorage in case it changed in same tab
    const interval = setInterval(() => {
      const hasToken = !!localStorage.getItem("token");
      const currentAuth = authorized;

      if (hasToken !== currentAuth) {
        setAuthorized(hasToken);

        if (hasToken) {
          setLoading(true);
          checkProfileCompletion();
        } else {
          setIsProfileCompleted(true);
          setLoading(false);
        }
      }
    }, 1000); // Check every second

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [authorized, checkProfileCompletion]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setAuthorized(true);
    setLoading(true);
    // Check profile completion after login
    checkProfileCompletion();
    // Fetch user ID
    fetchUserId();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUserId(null);
    setAuthorized(false);
    setIsProfileCompleted(true); // Reset on logout
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        authorized,
        isProfileCompleted,
        loading,
        userId,
        token,
        login,
        logout,
        checkProfileCompletion,
        setIsProfileCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
