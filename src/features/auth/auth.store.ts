import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { create } from "zustand";

import { googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { isStandalonePwa } from "@/lib/pwa";
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
  setProfile: (profile: UserProfile | null) => void;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  loading: true,
  initialized: false,
  errorMessage: "",

  initialize: () => {
    set({ initialized: true, loading: true });

    if (isFirebaseConfigured) {
      void getRedirectResult(auth).catch((error) => {
        set({
          errorMessage: getErrorMessage(error, "Google sign-in failed."),
        });
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      set({ firebaseUser, loading: true });

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

        set({ profile, loading: false, errorMessage: "" });
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

      if (isStandalonePwa()) {
        set({ loading: true });
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      set({
        loading: false,
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
  setProfile: (profile) => set({ profile }),
}));
