import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "./supabase";
import type { Profile, UserRole } from "../types/database.types";
import { db } from "../db";
import { profiles } from "../db/schema";

export const getUserProfile = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, user.id),
    });

    if (!profile) {
      console.error("Profile not found for user:", user.id);
      return null;
    }

    return profile;
  },
);

export const signUpWithRole = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      email: string;
      password: string;
      fullName: string;
      role: UserRole;
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      return {
        error: true,
        message: authError.message,
      };
    }

    if (!authData.user) {
      return {
        error: true,
        message: "Failed to create user",
      };
    }

    try {
      await db.insert(profiles).values({
        id: authData.user.id,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      });
    } catch (profileError: any) {
      return {
        error: true,
        message: profileError.message || "Failed to create profile",
      };
    }

    return {
      error: false,
      message: "Account created successfully",
    };
  });

export const loginWithEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        error: true,
        message: error.message,
      };
    }

    return {
      error: false,
      message: "Logged in successfully",
    };
  });

export const logoutUser = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        error: true,
        message: error.message,
      };
    }

    return {
      error: false,
      message: "Logged out successfully",
    };
  },
);

export function hasRole(profile: Profile | null, role: UserRole): boolean {
  return profile?.role === role;
}

export function hasAnyRole(
  profile: Profile | null,
  roles: UserRole[],
): boolean {
  return profile ? roles.includes(profile.role) : false;
}

export function isStudent(profile: Profile | null): boolean {
  return hasRole(profile, "student");
}

export function isTeacher(profile: Profile | null): boolean {
  return hasRole(profile, "teacher");
}

export function isAdmin(profile: Profile | null): boolean {
  return hasRole(profile, "admin");
}
