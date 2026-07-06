import { logEvents } from "@/lib/log-events";
import { logs } from "@/db/schema";

type LogRow = typeof logs.$inferSelect;

export async function GET() {
  const encoder = new TextEncoder();

  // Declared outside start() so cancel() can reference the same function
  // reference to remove it -- otherwise the listener stays attached to the
  // shared emitter forever after the client disconnects.
  let handleNewLog: (log: LogRow) => void;

  const stream = new ReadableStream({
    start(controller) {
      handleNewLog = (log) => {
        const sseMessage = `data: ${JSON.stringify(log)}\n\n`;
        controller.enqueue(encoder.encode(sseMessage));
      };

      // Start listening for log events
      logEvents.on("log", handleNewLog);
    },
    cancel() {
      // Called when the client disconnects (tab closed, EventSource
      // reconnecting, etc). Without this, the listener above leaks and
      // throws on every future emit() once the controller is closed.
      logEvents.off("log", handleNewLog);
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