import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import Header from "./components/headers";
import { auth, db, googleProvider, isFirebaseConfigured } from "./firebase";
import type { Player } from "./types/player";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getPlayerName(player: Player) {
  return (
    player.displayName || player.displayname || player.name || "Unnamed player"
  );
}

function getAuthUserName(currentUser: User) {
  return (
    currentUser.displayName ||
    currentUser.email?.split("@")[0] ||
    "Unnamed player"
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setPlayers([]);
      setPlayersLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const nextPlayers = snapshot.docs
          .map(
            (playerDoc) =>
              ({ uid: playerDoc.id, ...playerDoc.data() }) as Player,
          )
          .sort((left, right) =>
            getPlayerName(left).localeCompare(getPlayerName(right)),
          );

        setPlayers(nextPlayers);
        setPlayersLoading(false);
        setErrorMessage("");
      },
      (error) => {
        setPlayers([]);
        setPlayersLoading(false);
        setErrorMessage(getErrorMessage(error, "Could not load players."));
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) {
      return undefined;
    }

    const isGoogleUser = user.providerData.some(
      (provider) => provider?.providerId === "google.com",
    );

    if (!isGoogleUser) {
      return undefined;
    }

    let cancelled = false;

    const registerUser = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);

        if (cancelled || snapshot.exists()) {
          return;
        }

        if (user.email) {
          const emailQuery = query(
            collection(db, "users"),
            where("email", "==", user.email),
            limit(1),
          );
          const emailSnapshot = await getDocs(emailQuery);

          if (cancelled || !emailSnapshot.empty) {
            return;
          }
        }

        const nextPlayerName = getAuthUserName(user);

        await setDoc(userRef, {
          uid: user.uid,
          displayName: nextPlayerName,
          name: nextPlayerName,
          email: user.email || "",
          photoURL: user.photoURL || "",
          provider: "google",
          Grade: "",
          Position: "",
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not save player."));
        }
      }
    };

    registerUser();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) {
      setErrorMessage("Add your Firebase config in .env before signing in.");
      return;
    }

    try {
      setErrorMessage("");
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Google sign-in failed."));
    }
  };

  const handleLogout = async () => {
    try {
      setErrorMessage("");
      await signOut(auth);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Logout failed."));
    }
  };

  return (
    <div className="app-shell">
      <Header
        user={user}
        loading={loading}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
      />

      <main className="content">
        <section className="auth-card">
          <h1>Ollyo FC Players List</h1>
          <div className="players-list">
            {playersLoading ? (
              <p className="muted">Loading players...</p>
            ) : players.length ? (
              players.map((player) => (
                <div className="player-row" key={player.uid}>
                  <div className="player-avatar">
                    {player.photoURL ? (
                      <img src={player.photoURL} alt={getPlayerName(player)} />
                    ) : (
                      <span>{getPlayerName(player).charAt(0)}</span>
                    )}
                  </div>
                  <div className="player-meta">
                    <strong>{getPlayerName(player)}</strong>
                    <span className="muted">{player.email || "No email"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No players found yet.</p>
            )}
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}
        </section>
      </main>
    </div>
  );
}

export default App;
