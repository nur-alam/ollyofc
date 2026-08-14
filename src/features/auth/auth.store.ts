import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { create } from "zustand";

import { googleProvider } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";

import {
  auth,
  ensureUserProfile,
  getErrorMessage,
  getUserProfile,
} from "./auth.service";

type AuthState = {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  errorMessage: string;
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  profile: null,
  loading: true,
  initialized: false,
  errorMessage: "",

  initialize: () => {
    if (get().initialized) {
      return () => undefined;
    }

    set({ initialized: true, loading: true });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      set({ firebaseUser, loading: true, errorMessage: "" });

      if (!firebaseUser) {
        set({ profile: null, loading: false });
        return;
      }

      try {
        const isGoogleUser = firebaseUser.providerData.some(
          (provider) => provider?.providerId === "google.com",
        );

        const profile = isGoogleUser
          ? await ensureUserProfile(firebaseUser)
          : await getUserProfile(firebaseUser.uid);

        set({ profile, loading: false });
      } catch (error) {
        set({
          profile: null,
          loading: false,
          errorMessage: getErrorMessage(error, "Could not load your profile."),
        });
      }
    });

    return unsubscribe;
  },

  signInWithGoogle: async () => {
    try {
      set({ errorMessage: "" });
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      set({
        errorMessage: getErrorMessage(error, "Google sign-in failed."),
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ errorMessage: "" });
      await signOut(auth);
    } catch (error) {
      set({
        errorMessage: getErrorMessage(error, "Logout failed."),
      });
      throw error;
    }
  },

  clearError: () => set({ errorMessage: "" }),
}));
