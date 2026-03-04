import type { SSEMessage } from "@repo/shared";
import { SSE_HEARTBEAT_INTERVAL_MS } from "@repo/shared";

const controllers = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

export function broadcast(message: SSEMessage): void {
  const payload = encoder.encode(`data: ${JSON.stringify(message)}\n\n`);
  for (const controller of controllers) {
    try {
      controller.enqueue(payload);
    } catch {
      controllers.delete(controller);
    }
  }
}

export function createSSEResponse(): Response {
  let ctrl: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller;
      controllers.add(controller);
    },
    cancel() {
      controllers.delete(ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export function startHeartbeat(): void {
  setInterval(() => {
    const now = new Date();
    broadcast({
      type: "heartbeat",
      data: {
        timestamp: now.toISOString(),
        serverTime: now.toISOString(),
      },
    });
  }, SSE_HEARTBEAT_INTERVAL_MS);
}

export function getConnectionCount(): number {
  return controllers.size;
}
