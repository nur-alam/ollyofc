import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import toast from "react-hot-toast";
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

function authErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }

  return "";
}

function isIgnorableAuthError(error: unknown) {
  const code = authErrorCode(error);
  return (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/redirect-cancelled-by-user"
  );
}

function isPopupBlockedError(error: unknown) {
  const code = authErrorCode(error);
  return code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
}

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
        if (isIgnorableAuthError(error)) {
          return;
        }

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
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (isStandalonePwa() && isPopupBlockedError(error)) {
        try {
          set({ loading: true });
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          const errorMessage = getErrorMessage(redirectError, "Google sign-in failed.");
          set({ loading: false, errorMessage });
          toast.error(errorMessage);
          return;
        }
      }

      const errorMessage = getErrorMessage(error, "Google sign-in failed.");
      set({ loading: false, errorMessage });
      toast.error(errorMessage);
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
