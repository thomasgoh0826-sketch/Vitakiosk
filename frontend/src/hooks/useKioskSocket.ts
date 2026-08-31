import { useCallback, useEffect, useRef, useState } from "react";

import type { AvatarState, AvatarStateEvent } from "../types";


const DEFAULT_WS_BASE_URL = "ws://localhost:8000";
const VALID_STATES = new Set<AvatarState>([
  "idle",
  "listening",
  "thinking",
  "speaking",
  "error",
  "pharmacist_escalation",
]);

export function resolveWebSocketBaseUrl(
  value: string | undefined,
  location: Pick<Location, "protocol" | "host"> | undefined =
    typeof window !== "undefined" ? window.location : undefined,
): string {
  if (value && value !== "auto") {
    return value;
  }

  if (location?.host) {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${location.host}`;
  }

  return DEFAULT_WS_BASE_URL;
}

function parseStateEvent(value: unknown, sessionId: string): AvatarStateEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const event = value as Partial<AvatarStateEvent>;
  if (
    event.type !== "avatar_state" ||
    event.session_id !== sessionId ||
    !event.state ||
    !VALID_STATES.has(event.state)
  ) {
    return null;
  }
  return event as AvatarStateEvent;
}

function useKioskSocket(sessionId: string) {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<AvatarState>("idle");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer = 0;
    let attempt = 0;
    const baseUrl = resolveWebSocketBaseUrl(import.meta.env.VITE_WS_BASE_URL);
    setConnected(false);
    setState("idle");

    const connect = () => {
      if (disposed || typeof WebSocket !== "function") {
        return;
      }
      const socket = new WebSocket(`${baseUrl}/ws/kiosk/${encodeURIComponent(sessionId)}`);
      socketRef.current = socket;
      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      socket.onmessage = (message) => {
        try {
          const event = parseStateEvent(JSON.parse(message.data), sessionId);
          if (event) {
            setState(event.state);
          }
        } catch {
          // Malformed events are ignored; the kiosk keeps its safe local state.
        }
      };
      socket.onerror = () => setConnected(false);
      socket.onclose = () => {
        setConnected(false);
        if (!disposed) {
          const delay = Math.min(5_000, 500 * 2 ** attempt);
          attempt += 1;
          reconnectTimer = window.setTimeout(connect, delay);
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(reconnectTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
      }
    };
  }, [sessionId]);

  const sendState = useCallback((nextState: AvatarState) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ type: "client_state", state: nextState }));
  }, []);

  return { connected, state, sendState };
}

export default useKioskSocket;
