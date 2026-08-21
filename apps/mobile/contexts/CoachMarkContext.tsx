import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type CoachMarkKey = "map" | "restaurant" | "create";

type CoachMarkContextValue = {
  activeKey: CoachMarkKey | null;
  request: (key: CoachMarkKey) => void;
  dismiss: (key: CoachMarkKey) => Promise<void>;
};

const CoachMarkContext = createContext<CoachMarkContextValue | null>(null);

export function CoachMarkProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [activeKey, setActiveKey] = useState<CoachMarkKey | null>(null);
  const locallySeen = useRef(new Set<string>());

  const request = useCallback(
    (key: CoachMarkKey) => {
      if (!user?.onboardingCompletedAt) return;
      if (user.seenCoachMarks?.includes(key) || locallySeen.current.has(key)) return;
      setActiveKey((current) => current ?? key);
    },
    [user?.onboardingCompletedAt, user?.seenCoachMarks],
  );

  const dismiss = useCallback(
    async (key: CoachMarkKey) => {
      locallySeen.current.add(key);
      setActiveKey((current) => (current === key ? null : current));
      try {
        await api.onboarding.markCoachMarkSeen(key);
        await refreshUser();
      } catch (error) {
        console.warn("Could not persist coach mark", error);
      }
    },
    [refreshUser],
  );

  const value = useMemo(() => ({ activeKey, request, dismiss }), [activeKey, dismiss, request]);
  return <CoachMarkContext.Provider value={value}>{children}</CoachMarkContext.Provider>;
}

export function useCoachMarks() {
  const context = useContext(CoachMarkContext);
  if (!context) throw new Error("useCoachMarks must be used inside CoachMarkProvider");
  return context;
}
