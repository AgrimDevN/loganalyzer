import { EventEmitter } from "events";

// In-memory pub/sub for broadcasting newly-ingested logs to SSE clients.
// Single-process only -- fine for a local demo, would need Redis pub/sub
// if this ever ran across multiple server instances.
export const logEvents = new EventEmitter();
