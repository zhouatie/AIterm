import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  TerminalAgentStatus,
  TerminalAgentStatusState,
} from '../preload';

export interface TerminalSessionSummary {
  id: string;
  label: string;
  cwd: string;
  workspaceName: string;
}

interface AgentStatusContextValue {
  agentStatusBySessionId: Record<string, TerminalAgentStatus>;
  sessionSummariesById: Record<string, TerminalSessionSummary>;
  pendingAttentionCount: number;
  clearSessionAgentStatus: (sessionId: string, states?: readonly TerminalAgentStatusState[]) => void;
  setSessionSummaries: (summaries: TerminalSessionSummary[]) => void;
  activateSession: (sessionId: string) => boolean;
  registerSessionActivator: (activator: (sessionId: string) => boolean) => () => void;
}

const COMPLETED_STATUS_AUTO_CLEAR_MS = 2400;

const AgentStatusContext = createContext<AgentStatusContextValue | null>(null);

interface AgentStatusProviderProps {
  activeSessionId: string | null;
  children: React.ReactNode;
}

export const AgentStatusProvider: React.FC<AgentStatusProviderProps> = ({
  activeSessionId,
  children,
}) => {
  const [agentStatusBySessionId, setAgentStatusBySessionId] = useState<Record<string, TerminalAgentStatus>>({});
  const [sessionSummariesById, setSessionSummariesById] = useState<Record<string, TerminalSessionSummary>>({});
  const completedStatusTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sessionActivatorRef = useRef<((sessionId: string) => boolean) | null>(null);

  const cancelCompletedStatusTimer = useCallback((sessionId: string) => {
    const timer = completedStatusTimersRef.current.get(sessionId);
    if (!timer) return;
    clearTimeout(timer);
    completedStatusTimersRef.current.delete(sessionId);
  }, []);

  const clearSessionAgentStatus = useCallback((
    sessionId: string,
    states?: readonly TerminalAgentStatusState[],
  ) => {
    cancelCompletedStatusTimer(sessionId);
    setAgentStatusBySessionId((prev) => {
      const current = prev[sessionId];
      if (!current) return prev;
      if (states && !states.includes(current.state)) return prev;
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, [cancelCompletedStatusTimer]);

  const scheduleCompletedStatusClear = useCallback((sessionId: string) => {
    cancelCompletedStatusTimer(sessionId);
    const timer = setTimeout(() => {
      completedStatusTimersRef.current.delete(sessionId);
      clearSessionAgentStatus(sessionId, ['completed']);
    }, COMPLETED_STATUS_AUTO_CLEAR_MS);
    completedStatusTimersRef.current.set(sessionId, timer);
  }, [cancelCompletedStatusTimer, clearSessionAgentStatus]);

  useEffect(() => {
    const unsubscribe = window.terminalApi.onAgentStatus((status) => {
      if (status.state === 'idle') {
        clearSessionAgentStatus(status.id);
        return;
      }

      if (status.state === 'completed' && status.id === activeSessionId) {
        scheduleCompletedStatusClear(status.id);
      } else {
        cancelCompletedStatusTimer(status.id);
      }

      setAgentStatusBySessionId((prev) => ({
        ...prev,
        [status.id]: status,
      }));
    });
    return unsubscribe;
  }, [
    activeSessionId,
    cancelCompletedStatusTimer,
    clearSessionAgentStatus,
    scheduleCompletedStatusClear,
  ]);

  useEffect(() => {
    const unsubscribe = window.terminalApi.onAgentStatusCleared(({ id }) => {
      clearSessionAgentStatus(id);
    });
    return unsubscribe;
  }, [clearSessionAgentStatus]);

  useEffect(() => {
    return () => {
      for (const timer of completedStatusTimersRef.current.values()) {
        clearTimeout(timer);
      }
      completedStatusTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    const status = agentStatusBySessionId[activeSessionId];
    if (status?.state === 'completed') {
      scheduleCompletedStatusClear(activeSessionId);
    }
  }, [activeSessionId, agentStatusBySessionId, scheduleCompletedStatusClear]);

  const setSessionSummaries = useCallback((summaries: TerminalSessionSummary[]) => {
    const nextSummaries = summaries.reduce<Record<string, TerminalSessionSummary>>((acc, summary) => {
      acc[summary.id] = summary;
      return acc;
    }, {});
    const nextSessionIds = new Set(Object.keys(nextSummaries));

    setSessionSummariesById(nextSummaries);
    setAgentStatusBySessionId((prev) => {
      let changed = false;
      const next: Record<string, TerminalAgentStatus> = {};
      for (const [sessionId, status] of Object.entries(prev)) {
        if (nextSessionIds.has(sessionId)) {
          next[sessionId] = status;
        } else {
          cancelCompletedStatusTimer(sessionId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [cancelCompletedStatusTimer]);

  const registerSessionActivator = useCallback((activator: (sessionId: string) => boolean) => {
    sessionActivatorRef.current = activator;
    return () => {
      if (sessionActivatorRef.current === activator) {
        sessionActivatorRef.current = null;
      }
    };
  }, []);

  const activateSession = useCallback((sessionId: string): boolean => {
    if (!sessionSummariesById[sessionId]) {
      clearSessionAgentStatus(sessionId);
      return false;
    }
    const didActivate = sessionActivatorRef.current?.(sessionId) ?? false;
    if (!didActivate) {
      clearSessionAgentStatus(sessionId);
    }
    return didActivate;
  }, [clearSessionAgentStatus, sessionSummariesById]);

  const pendingAttentionCount = useMemo(() => (
    Object.values(agentStatusBySessionId).filter((status) =>
      status.state === 'needs_user' || status.state === 'error',
    ).length
  ), [agentStatusBySessionId]);

  const value = useMemo<AgentStatusContextValue>(() => ({
    agentStatusBySessionId,
    sessionSummariesById,
    pendingAttentionCount,
    clearSessionAgentStatus,
    setSessionSummaries,
    activateSession,
    registerSessionActivator,
  }), [
    activateSession,
    agentStatusBySessionId,
    clearSessionAgentStatus,
    pendingAttentionCount,
    registerSessionActivator,
    sessionSummariesById,
    setSessionSummaries,
  ]);

  return (
    <AgentStatusContext.Provider value={value}>
      {children}
    </AgentStatusContext.Provider>
  );
};

export function useAgentStatus(): AgentStatusContextValue {
  const context = useContext(AgentStatusContext);
  if (!context) throw new Error('useAgentStatus must be used within AgentStatusProvider');
  return context;
}
