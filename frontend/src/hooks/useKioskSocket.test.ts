import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useKioskSocket, { resolveWebSocketBaseUrl } from "./useKioskSocket";


class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  emit(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}


describe("useKioskSocket", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  it("uses a secure same-origin socket when the kiosk is served through HTTPS", () => {
    expect(resolveWebSocketBaseUrl("auto", {
      protocol: "https:",
      host: "kiosk.trycloudflare.com",
    })).toBe("wss://kiosk.trycloudflare.com");
  });

  it("uses session-scoped server avatar states and can send local state", () => {
    const { result, unmount } = renderHook(() => useKioskSocket("session-a"));
    const socket = FakeWebSocket.instances[0];

    expect(socket.url).toContain("/ws/kiosk/session-a");
    act(() => socket.open());
    expect(result.current.connected).toBe(true);

    act(() => {
      socket.emit({
        type: "avatar_state",
        session_id: "session-a",
        state: "pharmacist_escalation",
        detail: "red flag",
      });
    });
    expect(result.current.state).toBe("pharmacist_escalation");

    act(() => result.current.sendState("idle"));
    expect(JSON.parse(socket.sent[0])).toEqual({
      type: "client_state",
      state: "idle",
    });
    unmount();
  });

  it("ignores state events for another session and reports disconnect", () => {
    const { result, unmount } = renderHook(() => useKioskSocket("session-a"));
    const socket = FakeWebSocket.instances[0];
    act(() => socket.open());

    act(() => {
      socket.emit({
        type: "avatar_state",
        session_id: "session-b",
        state: "speaking",
        detail: "other kiosk",
      });
    });
    expect(result.current.state).toBe("idle");

    act(() => socket.close());
    expect(result.current.connected).toBe(false);
    unmount();
  });

  it("stays in safe local mode when WebSocket is unavailable", () => {
    vi.stubGlobal("WebSocket", undefined);

    const { result } = renderHook(() => useKioskSocket("session-a"));

    expect(result.current.connected).toBe(false);
    expect(result.current.state).toBe("idle");
  });
});
