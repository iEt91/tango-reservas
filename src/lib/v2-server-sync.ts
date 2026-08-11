import { createV2OperationalId } from "@/lib/v2-operational-storage";

export type V2ServerSyncDomain =
  | "stock"
  | "cash";

type V2ServerSyncMessage = {
  id: string;
  domain: V2ServerSyncDomain;
  createdAt: number;
};

const SERVER_SYNC_CHANNEL =
  "tango-v2-server-sync-v1";
const SERVER_SYNC_STORAGE_KEY =
  "tango-v2-server-sync-signal-v1";
const SERVER_SYNC_WINDOW_EVENT =
  "tango-v2-server-sync";

function isServerSyncMessage(
  value: unknown,
): value is V2ServerSyncMessage {
  if (
    !value
    || typeof value !== "object"
  ) {
    return false;
  }

  const source =
    value as Record<string, unknown>;

  return (
    typeof source.id === "string"
    && source.id.length > 0
    && (
      source.domain === "stock"
      || source.domain === "cash"
    )
    && typeof source.createdAt === "number"
    && Number.isFinite(source.createdAt)
  );
}

function parseStoredMessage(
  value: string | null,
) {
  if (!value) return null;

  try {
    const parsed =
      JSON.parse(value) as unknown;

    return isServerSyncMessage(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function publishV2ServerSync(
  domain: V2ServerSyncDomain,
) {
  if (typeof window === "undefined") {
    return;
  }

  const message: V2ServerSyncMessage = {
    id:
      createV2OperationalId(
        `server-sync-${domain}`,
      ),
    domain,
    createdAt: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent(
      SERVER_SYNC_WINDOW_EVENT,
      {
        detail: message,
      },
    ),
  );

  if (
    typeof BroadcastChannel !== "undefined"
  ) {
    try {
      const channel =
        new BroadcastChannel(
          SERVER_SYNC_CHANNEL,
        );

      channel.postMessage(message);
      channel.close();

      return;
    } catch {
      // Fallback below.
    }
  }

  try {
    window.localStorage.setItem(
      SERVER_SYNC_STORAGE_KEY,
      JSON.stringify(message),
    );
  } catch {
    // A focus refresh remains as a final fallback.
  }
}

export function subscribeV2ServerSync(
  domain: V2ServerSyncDomain,
  listener: () => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let lastMessageId = "";

  function acceptMessage(
    value: unknown,
  ) {
    if (
      !isServerSyncMessage(value)
      || value.domain !== domain
      || value.id === lastMessageId
    ) {
      return;
    }

    lastMessageId = value.id;
    listener();
  }

  function handleWindowEvent(
    event: Event,
  ) {
    acceptMessage(
      (
        event as CustomEvent<unknown>
      ).detail,
    );
  }

  window.addEventListener(
    SERVER_SYNC_WINDOW_EVENT,
    handleWindowEvent,
  );

  let channel:
    | BroadcastChannel
    | null = null;
  let handleBroadcast:
    | ((event: MessageEvent<unknown>) => void)
    | null = null;
  let handleStorage:
    | ((event: StorageEvent) => void)
    | null = null;

  if (
    typeof BroadcastChannel !== "undefined"
  ) {
    try {
      channel =
        new BroadcastChannel(
          SERVER_SYNC_CHANNEL,
        );
      handleBroadcast =
        (event) => {
          acceptMessage(event.data);
        };
      channel.addEventListener(
        "message",
        handleBroadcast,
      );
    } catch {
      channel = null;
      handleBroadcast = null;
    }
  }

  if (!channel) {
    handleStorage =
      (event) => {
        if (
          event.key
          !== SERVER_SYNC_STORAGE_KEY
        ) {
          return;
        }

        acceptMessage(
          parseStoredMessage(
            event.newValue,
          ),
        );
      };

    window.addEventListener(
      "storage",
      handleStorage,
    );
  }

  return () => {
    window.removeEventListener(
      SERVER_SYNC_WINDOW_EVENT,
      handleWindowEvent,
    );

    if (
      channel
      && handleBroadcast
    ) {
      channel.removeEventListener(
        "message",
        handleBroadcast,
      );
      channel.close();
    }

    if (handleStorage) {
      window.removeEventListener(
        "storage",
        handleStorage,
      );
    }
  };
}
