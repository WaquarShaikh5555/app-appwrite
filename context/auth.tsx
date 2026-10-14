import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppwriteException, ID, Models } from "appwrite";
import { account } from "@/constants/appwrite";

type User = Models.User<Models.Preferences>;

interface AuthContextValue {
  /** The signed-in user, or null when signed out. */
  user: User | null;
  /** True while the initial session check is in flight. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, ask Appwrite whether a session cookie already exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await account.get();
        if (!cancelled) setUser(current);
      } catch {
        // A 401 here just means "not signed in" — the normal signed-out state.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await account.createEmailPasswordSession({ email, password });
    setUser(await account.get());
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      await account.create({ userId: ID.unique(), email, password, name });
      // account.create() does NOT open a session in this SDK version
      // (Appwrite 1.9 / SDK 21) — so log in explicitly afterwards.
      await account.createEmailPasswordSession({ email, password });
      setUser(await account.get());
    },
    [],
  );

  const signOut = useCallback(async () => {
    await account.deleteSession({ sessionId: "current" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Turn an AppwriteException (or anything else) into a readable line. */
export function errorMessage(err: unknown): string {
  if (err instanceof AppwriteException) {
    return err.code ? `${err.message} (${err.code})` : err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
