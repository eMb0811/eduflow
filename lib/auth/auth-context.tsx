"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoginInput, RegisterInput } from "@/lib/validations/auth";

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface Profile {
  id: string;
  userId: string;
  email?: string | null;
  fullName?: string | null;
  academicLevel?: string | null;
  fieldOfStudy?: string | null;
  academicGoals?: string | null;
  avatarUrl?: string | null;
  onboardingCompleted: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    data: LoginInput
  ) => Promise<{
    success: boolean;
    user?: User;
    onboardingCompleted?: boolean;
    error?: string;
  }>;
  register: (data: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Charger la session active au montage
  const fetchSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setUser(json.data.user);
          setProfile(json.data.profile || null);
        } else {
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de la session :", err);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = async (data: LoginInput) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          error: json.message || "Identifiants invalides",
        };
      }

      setUser(json.data.user);
      setProfile(json.data.profile);
      return {
        success: true,
        user: json.data.user,
        onboardingCompleted: Boolean(json.data.profile?.onboardingCompleted),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erreur de connexion",
      };
    }
  };

  const register = async (data: RegisterInput) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          error: json.message || "Erreur lors de l'inscription",
        };
      }

      setUser(json.data.user);
      setProfile(json.data.profile);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erreur lors de l'inscription",
      };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setProfile(null);
      router.push("/login");
      router.refresh();
    }
  };

  const refreshProfile = async () => {
    await fetchSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}
