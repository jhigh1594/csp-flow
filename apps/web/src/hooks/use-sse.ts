import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import { applySSEEventToStore } from "@/lib/sse-store-bridge";

/**
 * Maps SSE event types to TanStack Query key prefixes that should be
 * invalidated when that event arrives.  Individual entries are prefix-matched
 * so `["tasks"]` covers `["tasks", projectId]` etc.
 */
const EVENT_KEY_MAP: Record<string, string[][]> = {
  "task.created": [["tasks"]],
  "task.status_changed": [["tasks"], ["task"], ["notifications"]],
  "task.priority_changed": [["tasks"], ["task"]],
  "task.roadmap_group_changed": [["tasks"], ["task"]],
  "task.title_changed": [["tasks"], ["task"]],
  "task.description_changed": [["tasks"], ["task"]],
  "task.assignee_changed": [["tasks"], ["task"]],
  "task.unassigned": [["tasks"], ["task"]],
  "task.due_date_changed": [["tasks"], ["task"]],
  "task.moved": [["tasks"], ["task"], ["projects"]],
  "task.comment_created": [["activities"], ["comments"]],
  "notification.created": [["notifications"]],
  "workspace.created": [["workspaces"]],
  "time-entry.created": [["time-entries"]],
};

/** Max consecutive errors before we stop reconnecting. */
const MAX_RETRY_COUNT = 5;
/** Base delay in ms for exponential backoff between retries. */
const RETRY_BASE_DELAY_MS = 1_000;

type SSEEventData = Record<string, unknown>;

function buildStreamUrl(): string {
  const base = resolveApiBaseUrl().replace(/\/+$/, "");
  return `${base}/events/stream`;
}

/**
 * Hook that subscribes to the server-sent events stream and invalidates
 * relevant TanStack Query caches in response.
 *
 * Must be called unconditionally (React hooks rules) but only connects when
 * `isAuthenticated` is `true`.
 */
export function useSSE(isAuthenticated: boolean): void {
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  const handleEvent = useCallback(
    (eventType: string, rawData: string) => {
      // Reset retry counter on any successful message.
      retryCountRef.current = 0;

      let data: SSEEventData | null = null;
      try {
        data = JSON.parse(rawData) as SSEEventData;
      } catch {
        // Heartbeat or malformed payload — nothing to invalidate.
        return;
      }

      const keyPrefixes = EVENT_KEY_MAP[eventType];
      if (!keyPrefixes) return;

      const taskId = typeof data.taskId === "string" ? data.taskId : null;
      const projectId =
        typeof data.projectId === "string" ? data.projectId : null;

      for (const prefix of keyPrefixes) {
        // Invalidate the broad prefix (e.g. ["tasks"] matches ["tasks", projectId]).
        queryClient.invalidateQueries({ queryKey: prefix });

        // For task-specific keys, also invalidate with the concrete ID.
        if (prefix[0] === "tasks" && projectId) {
          queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        }
        if (prefix[0] === "task" && taskId) {
          queryClient.invalidateQueries({ queryKey: ["task", taskId] });
        }
        if (prefix[0] === "time-entries" && taskId) {
          queryClient.invalidateQueries({
            queryKey: ["time-entries", taskId],
          });
        }
        if (prefix[0] === "activities" && taskId) {
          queryClient.invalidateQueries({ queryKey: ["activities", taskId] });
        }
      }

      // Apply directly to Zustand store for instant board updates.
      applySSEEventToStore(eventType, data);
    },
    [queryClient],
  );

  const connect = useCallback(() => {
    // Clean up any existing connection first.
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = buildStreamUrl();
    const es = new EventSource(url);
    esRef.current = es;

    // Listen for each known event type individually so we get typed access
    // to `event` name and raw `data` string.
    const knownTypes = Object.keys(EVENT_KEY_MAP);
    for (const eventType of knownTypes) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        handleEvent(eventType, e.data);
      });
    }

    // Also handle the "connected" confirmation event.
    es.addEventListener("connected", () => {
      retryCountRef.current = 0;
    });

    es.onerror = () => {
      // EventSource natively reconnects, but we enforce a max retry count.
      retryCountRef.current += 1;
      if (retryCountRef.current >= MAX_RETRY_COUNT) {
        es.close();
        esRef.current = null;
        // Schedule a delayed manual reconnect with exponential backoff.
        const delay =
          RETRY_BASE_DELAY_MS *
          2 ** Math.min(retryCountRef.current - MAX_RETRY_COUNT, 6);
        setTimeout(() => {
          if (isAuthenticated) {
            retryCountRef.current = 0;
            connect();
          }
        }, delay);
      }
    };
  }, [handleEvent, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Not authenticated — tear down any existing connection.
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      retryCountRef.current = 0;
      return;
    }

    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);
}
