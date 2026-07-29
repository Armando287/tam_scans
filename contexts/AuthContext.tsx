"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  uploadCount: number;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function syncProfile(authUser: any) {
    try {
      // Fetch or create profile in public.users
      let { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", authUser.email)
        .maybeSingle();

      if (!data && !error) {
        // Create if missing
        const { data: newData, error: insertError } = await supabase
          .from("users")
          .insert({
            id: authUser.id,
            email: authUser.email,
            displayName: authUser.user_metadata?.displayName || authUser.email?.split("@")[0] || "User",
            isAdmin: false,
            isVerified: false,
            isBanned: false,
            uploadCount: 0,
          })
          .select()
          .single();
        if (!insertError) data = newData;
      } else if (data && data.id !== authUser.id) {
        // Link seeded admin user by updating the ID to the real auth ID
        const { data: updatedData } = await supabase
          .from("users")
          .update({ id: authUser.id })
          .eq("email", authUser.email)
          .select()
          .single();
        if (updatedData) data = updatedData;
      }

      if (data) {
        setProfile({
          uid: data.id,
          email: data.email,
          displayName: data.displayName,
          emailVerified: data.isVerified,
          isAdmin: data.isAdmin,
          isBanned: data.isBanned,
          uploadCount: data.uploadCount,
        });
      }
    } catch (e) {
      console.error("Profile sync error:", e);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) syncProfile(session.user);
      else setProfile(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) syncProfile(session.user);
      else setProfile(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) await syncProfile(data.user);
  }

  async function register(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { displayName } }
    });
    if (error) throw error;
    if (data.user) await syncProfile(data.user);
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await syncProfile(user);
  }

  async function getToken() {
    if (!user) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
