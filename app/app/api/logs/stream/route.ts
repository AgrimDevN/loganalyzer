import { logEvents } from "@/lib/log-events";
import { logs } from "@/db/schema";
import { getSession } from "@/lib/auth";

type LogRow = typeof logs.$inferSelect;

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const eventName = `log:${session.userId}`;
  const encoder = new TextEncoder();
  let handleNewLog: (log: LogRow) => void;

  const stream = new ReadableStream({
    start(controller) {
      handleNewLog = (log) => {
        const sseMessage = `data: ${JSON.stringify(log)}\n\n`;
        controller.enqueue(encoder.encode(sseMessage));
      };
      logEvents.on(eventName, handleNewLog);
    },
    cancel() {
      logEvents.off(eventName, handleNewLog);
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
