import { Loader2Icon, LogInIcon } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { useAuthStore } from "@/features/auth/auth.store";
import { isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";

export function LoginPage() {
  const location = useLocation();
  const { firebaseUser, loading, errorMessage, signInWithGoogle } =
    useAuthStore();

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";

  if (!loading && firebaseUser) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="app-shell min-h-screen bg-muted/30">
      <Header />

      <main className="content grid min-h-[calc(100vh-4rem)] place-items-center p-4">
        <section className="auth-card w-full max-w-md">
          <h1 className="mt-0">Sign in to Ollyo FC</h1>
          <p className="text-muted-foreground">
            Manage office football games, teams, and match stats.
          </p>

          {!isFirebaseConfigured && (
            <p className="helper-text">
              Firebase keys are missing. Copy <code>.env.example</code> to{" "}
              <code>.env</code> and add your Firebase project values.
            </p>
          )}

          <Button
            className={cn("mt-6 w-full", loading && "cursor-not-allowed")}
            onClick={() => signInWithGoogle()}
            disabled={loading || !isFirebaseConfigured}
          >
            {loading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Checking session...
              </>
            ) : (
              <>
                <LogInIcon className="size-4" />
                Continue with Google
              </>
            )}
          </Button>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <p className="mt-4 text-sm text-muted-foreground">
            New users are assigned the <strong>user</strong> role by default.
            Ask an admin to upgrade your role if needed.
          </p>

          <Link
            to="/"
            className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        </section>
      </main>
    </div>
  );
}
