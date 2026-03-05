import { describe, it, expect, beforeEach } from "@jest/globals";
import { sseManager } from "../server/utils/sseManager";
import { EventEmitter } from "events";

// Mock Response object
function createMockResponse() {
  const emitter = new EventEmitter();
  const chunks: string[] = [];
  return {
    write: (data: string) => { chunks.push(data); return true; },
    on: (event: string, listener: (...args: any[]) => void) => emitter.on(event, listener),
    emit: (event: string) => emitter.emit(event),
    getChunks: () => chunks,
  } as any;
}

describe("SSE Manager", () => {
  it("should have no clients initially", () => {
    expect(sseManager.getClientCount()).toBeGreaterThanOrEqual(0);
  });

  it("should add a client", () => {
    const res = createMockResponse();
    const initialCount = sseManager.getClientCount();
    sseManager.addClient("user-1", "parent", res);
    expect(sseManager.getClientCount()).toBe(initialCount + 1);

    // Cleanup
    res.emit("close");
  });

  it("should send events to connected clients", () => {
    const res = createMockResponse();
    sseManager.addClient("user-send-test", "parent", res);

    sseManager.sendToUser("user-send-test", "parent", "notification", { id: "notif-1" });

    const chunks = res.getChunks();
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain("event: notification");
    expect(chunks[0]).toContain("notif-1");

    // Cleanup
    res.emit("close");
  });

  it("should remove client on close", () => {
    const res = createMockResponse();
    const before = sseManager.getClientCount();
    sseManager.addClient("user-close-test", "parent", res);
    expect(sseManager.getClientCount()).toBe(before + 1);

    res.emit("close");
    expect(sseManager.getClientCount()).toBe(before);
  });

  it("should not crash when sending to non-existent user", () => {
    expect(() => {
      sseManager.sendToUser("nonexistent", "parent", "test", {});
    }).not.toThrow();
  });
});
