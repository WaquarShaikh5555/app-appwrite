import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "eternalz:onboarding:v1";

interface OnboardingContextValue {
  /** True once the first-run tour has been completed. */
  seen: boolean;
  /** True while the stored flag is being read. */
  loading: boolean;
  complete: () => Promise<void>;
  replay: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined,
);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) setSeen(value === "true");
      } catch {
        // If storage is unavailable, show the intro rather than hiding it.
        if (!cancelled) setSeen(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const complete = useCallback(async () => {
    setSeen(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Non-fatal: the tour reappears next launch.
    }
  }, []);

  const replay = useCallback(async () => {
    setSeen(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal.
    }
  }, []);

  const value = useMemo(
    () => ({ seen, loading, complete, replay }),
    [seen, loading, complete, replay],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  return ctx;
}
