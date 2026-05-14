import { EventEmitter } from "node:events";

const EVENTS = new EventEmitter();
EVENTS.setMaxListeners(100);

export type EventPayload<T = unknown> = {
  type: string;
  data: T;
  timestamp: string;
};

export async function shutdownEventBus(): Promise<void> {
  EVENTS.removeAllListeners();
}

export async function publishEvent(
  eventType: string,
  data: unknown,
): Promise<void> {
  const payload: EventPayload = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  };

  try {
    EVENTS.emit(eventType, payload);
  } catch (error) {
    console.error("Failed to publish event:", error);
    throw error;
  }
}

export async function subscribeToEvent<T>(
  eventType: string,
  handler: (data: T) => Promise<void>,
): Promise<void> {
  try {
    EVENTS.on(eventType, async (payload: EventPayload<T>) => {
      try {
        await handler(payload.data);
      } catch (error) {
        console.error(`Error processing event ${eventType}:`, error);
      }
    });
  } catch (error) {
    console.error("Failed to subscribe to event:", error);
    throw error;
  }
}

export const ALL_EVENT_TYPES = [
  "task.created",
  "task.status_changed",
  "task.priority_changed",
  "task.roadmap_group_changed",
  "task.unassigned",
  "task.assignee_changed",
  "task.due_date_changed",
  "task.title_changed",
  "task.description_changed",
  "task.moved",
  "task.comment_created",
  "notification.created",
  "time-entry.created",
  "workspace.created",
] as const;

export type EventType = (typeof ALL_EVENT_TYPES)[number];

export function subscribeToAllEvents(
  handler: (eventType: string, payload: EventPayload) => void,
): () => void {
  const wrappedHandler = (eventType: string) => (payload: EventPayload) => {
    handler(eventType, payload);
  };

  const handlers = new Map<string, (payload: EventPayload) => void>();

  for (const eventType of ALL_EVENT_TYPES) {
    const handlerFn = wrappedHandler(eventType);
    handlers.set(eventType, handlerFn);
    EVENTS.on(eventType, handlerFn);
  }

  return () => {
    for (const [eventType, handlerFn] of handlers) {
      EVENTS.off(eventType, handlerFn);
    }
  };
}

process.on("SIGTERM", () => {
  shutdownEventBus().catch(console.error);
});
