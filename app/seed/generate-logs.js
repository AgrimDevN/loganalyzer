const fs = require("fs");
const path = require("path");

// --- Config -----------------------------------------------------------
const SERVICES = [
  "api-gateway",
  "auth-service",
  "payment-service",
  "db-proxy",
  "notification-service",
];

const WINDOW_START = new Date("2026-06-22T09:00:00.000Z");
const WINDOW_END = new Date("2026-06-22T09:45:00.000Z");
const NOISE_LINE_COUNT = 1000;

// Services impacted by the scripted incident, and the window during which
// their "normal operation" noise should not appear (a crashing/overloaded
// service doesn't keep logging happy-path success messages).
const AFFECTED_SERVICES = ["payment-service", "db-proxy", "api-gateway", "notification-service"];
const INCIDENT_WINDOW_START = new Date("2026-06-22T09:20:00.000Z");
const INCIDENT_WINDOW_END = new Date("2026-06-22T09:35:15.000Z");

// --- Helpers ------------------------------------------------------------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTimestampInWindow() {
  const t = WINDOW_START.getTime() + Math.random() * (WINDOW_END.getTime() - WINDOW_START.getTime());
  return new Date(t);
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function makeMetadata() {
  return {
    requestId: `req-${randInt(100000, 999999)}`,
    podName: `pod-${randInt(1, 12)}`,
    latencyMs: randInt(15, 350),
  };
}

// --- Per-service noise templates (normal operation) ----------------------
const NOISE_TEMPLATES = {
  "api-gateway": [
    { severity: "info", message: () => `GET /api/v1/health 200 OK (${randInt(5, 40)}ms)` },
    { severity: "info", message: () => `Request routed to ${pick(SERVICES)} (trace: req-${randInt(100000, 999999)})` },
    { severity: "info", message: () => `Rate limit check passed for client client-${randInt(1, 500)} (${randInt(5, 90)}/100 requests/min)` },
    { severity: "warn", message: () => `Slow response from ${pick(SERVICES)}: ${randInt(1000, 1400)}ms (threshold: 1000ms)` },
  ],
  "auth-service": [
    { severity: "info", message: () => `POST /api/v1/login 200 OK for user user-${randInt(1, 5000)} (${randInt(20, 200)}ms)` },
    { severity: "info", message: () => `JWT token issued for user user-${randInt(1, 5000)}, expires in 3600s` },
    { severity: "info", message: () => `Session refreshed for user user-${randInt(1, 5000)}` },
    { severity: "warn", message: () => `Failed login attempt for user user-${randInt(1, 5000)} (attempt 3, IP 192.168.${randInt(0, 255)}.${randInt(0, 255)})` },
  ],
  "payment-service": [
    { severity: "info", message: () => `POST /api/v1/payments/charge 200 OK, amount=$${randInt(5, 900)}.00, txn=txn-${randInt(100000, 999999)} (${randInt(50, 300)}ms)` },
    { severity: "info", message: () => `Payment method validated for customer cust-${randInt(1, 3000)}` },
    { severity: "info", message: () => `Refund processed for txn-${randInt(100000, 999999)}, amount=$${randInt(5, 500)}.00` },
    { severity: "info", message: () => `Webhook delivered to notification-service for txn-${randInt(100000, 999999)}` },
  ],
  "db-proxy": [
    { severity: "info", message: () => `Query executed: SELECT * FROM transactions WHERE id = txn-${randInt(100000, 999999)} (${randInt(5, 60)}ms)` },
    { severity: "info", message: () => `Connection acquired from pool (${randInt(2, 15)}/50 in use)` },
    { severity: "info", message: () => `Connection released back to pool` },
    { severity: "warn", message: () => `Slow query detected: ${randInt(800, 1200)}ms for transactions table scan` },
  ],
  "notification-service": [
    { severity: "info", message: () => `Email sent: payment_confirmation to user${randInt(1, 5000)}@example.com (txn-${randInt(100000, 999999)})` },
    { severity: "info", message: () => `SMS notification queued for user user-${randInt(1, 5000)}` },
    { severity: "info", message: () => `Push notification delivered to device device-${randInt(1, 9000)}` },
    { severity: "info", message: () => `Webhook received from payment-service for txn-${randInt(100000, 999999)}` },
  ],
};

// --- Per-service degraded-state templates (used only inside the incident
// window for affected services). These don't repeat the scripted incident
// lines verbatim -- they're the surrounding chatter a real system would
// also emit while degraded: retries, elevated latency, queueing.
const DEGRADED_TEMPLATES = {
  "payment-service": [
    { severity: "error", message: () => `Transaction txn-${randInt(100000, 999999)} timed out waiting for DB connection (${randInt(4000, 6000)}ms)` },
    { severity: "warn", message: () => `Retrying transaction txn-${randInt(100000, 999999)} (attempt 2/3)` },
    { severity: "error", message: () => `Failed to acquire DB connection for txn-${randInt(100000, 999999)}: pool exhausted` },
    { severity: "warn", message: () => `Response time degraded: ${randInt(3000, 5000)}ms (baseline: 150ms)` },
  ],
  "db-proxy": [
    { severity: "error", message: () => `Query timeout after 5000ms for transactions table` },
    { severity: "warn", message: () => `Connection acquisition wait time elevated: ${randInt(1800, 3000)}ms` },
    { severity: "error", message: () => `Rejected connection request: pool exhausted (50/50 in use)` },
    { severity: "warn", message: () => `Queueing connection request, queue depth: ${randInt(10, 30)}` },
  ],
  "api-gateway": [
    { severity: "warn", message: () => `Circuit breaker opened for payment-service after 5 consecutive failures` },
    { severity: "warn", message: () => `Retrying request to payment-service (attempt 2/3)` },
    { severity: "error", message: () => `Upstream timeout: payment-service did not respond within 5000ms (route: /api/v1/payments)` },
    { severity: "warn", message: () => `Increased error rate on route /api/v1/payments: ${randInt(40, 80)}% (5min window)` },
  ],
  "notification-service": [
    { severity: "warn", message: () => `Notification delivery delayed, requeued for retry (attempt 2/3)` },
    { severity: "error", message: () => `Webhook delivery timeout from payment-service` },
    { severity: "warn", message: () => `Retry queue depth increasing: ${randInt(50, 130)} pending` },
    { severity: "error", message: () => `Failed to deliver payment confirmation: upstream payment-service unreachable` },
  ],
};

// --- Scripted incident: payment-service memory leak -> cascading failure -
// Root cause: v2.4.1 deploy introduced a memory leak in the transaction
// cache, which OOM-kills payment-service, exhausts db-proxy's connection
// pool, causes api-gateway upstream timeouts, and breaks notification
// delivery -- until a rollback resolves it. auth-service is unaffected
// (control group).
const INCIDENT_LOGS = [
  ["payment-service", "warn", "Heap usage climbing: 78% of max heap (suspected memory leak in transaction cache)", "09:20:00"],
  ["payment-service", "warn", "Heap usage climbing: 85% of max heap (suspected memory leak in transaction cache)", "09:21:30"],
  ["payment-service", "warn", "Heap usage climbing: 92% of max heap (suspected memory leak in transaction cache)", "09:23:00"],
  ["payment-service", "error", "GC pause exceeded 5000ms, event loop blocked", "09:24:15"],
  ["payment-service", "critical", "OutOfMemoryError: Java heap space - process killed by OOM killer (exit code 137)", "09:25:00"],
  ["payment-service", "critical", "pod payment-service-7d9f4c restarting (CrashLoopBackOff, restart count: 1)", "09:25:05"],
  ["db-proxy", "warn", "Connection pool utilization at 95% (45/50 connections in use)", "09:25:10"],
  ["db-proxy", "error", "Connection pool exhausted: no available connections, 12 requests queued", "09:25:40"],
  ["api-gateway", "error", "Upstream timeout: payment-service did not respond within 5000ms (route: /api/v1/payments)", "09:26:00"],
  ["api-gateway", "critical", "504 Gateway Timeout returned to client for POST /api/v1/payments/charge", "09:26:15"],
  ["notification-service", "error", "Failed to deliver payment confirmation: upstream payment-service unreachable (connection refused)", "09:26:30"],
  ["payment-service", "critical", "OutOfMemoryError: Java heap space - process killed by OOM killer (exit code 137)", "09:27:00"],
  ["payment-service", "critical", "pod payment-service-7d9f4c restarting (CrashLoopBackOff, restart count: 2)", "09:27:05"],
  ["db-proxy", "critical", "Connection pool exhausted: no available connections, 27 requests queued", "09:28:00"],
  ["api-gateway", "critical", "504 Gateway Timeout returned to client for POST /api/v1/payments/charge", "09:28:30"],
  ["notification-service", "error", "Failed to deliver payment confirmation: upstream payment-service unreachable (connection refused)", "09:29:00"],
  ["payment-service", "critical", "OutOfMemoryError: Java heap space - process killed by OOM killer (exit code 137)", "09:30:00"],
  ["payment-service", "critical", "pod payment-service-7d9f4c restarting (CrashLoopBackOff, restart count: 3)", "09:30:05"],
  ["db-proxy", "critical", "Connection pool exhausted: no available connections, 31 requests queued", "09:30:30"],
  ["api-gateway", "critical", "504 Gateway Timeout returned to client for POST /api/v1/payments/charge", "09:31:00"],
  ["notification-service", "error", "Notification retry queue depth: 134 (threshold: 50)", "09:32:00"],
  ["payment-service", "info", "Deployment rollback initiated: payment-service v2.4.1 -> v2.4.0 (suspected memory leak in v2.4.1 transaction cache)", "09:33:00"],
  ["payment-service", "info", "Rollback complete, heap usage stable at 38%", "09:34:00"],
  ["db-proxy", "info", "Connection pool utilization normalized: 12/50 connections in use", "09:34:30"],
  ["api-gateway", "info", "Upstream payment-service latency normalized (avg 120ms)", "09:35:00"],
  ["notification-service", "info", "Notification retry queue drained, all pending payment confirmations delivered", "09:35:15"],
];

// --- Build the dataset ----------------------------------------------------
const lines = [];

// Background noise across the whole window, all services.
// Affected services pull from the degraded pool while inside the incident
// window instead of their normal "everything is fine" templates -- a
// service that's mid-outage doesn't log happy-path success in between
// crash lines.
for (let i = 0; i < NOISE_LINE_COUNT; i++) {
  const serviceName = pick(SERVICES);
  const timestamp = randomTimestampInWindow();
  const isAffected = AFFECTED_SERVICES.includes(serviceName);
  const inIncidentWindow = timestamp >= INCIDENT_WINDOW_START && timestamp < INCIDENT_WINDOW_END;

  const templatePool = isAffected && inIncidentWindow ? DEGRADED_TEMPLATES[serviceName] : NOISE_TEMPLATES[serviceName];
  const template = pick(templatePool);

  lines.push({
    serviceName,
    severity: template.severity,
    message: template.message(),
    timestamp: timestamp.toISOString(),
    metadata: makeMetadata(),
  });
}

// Scripted incident, anchored to explicit times within the same window
for (const [serviceName, severity, message, timeOfDay] of INCIDENT_LOGS) {
  const timestamp = new Date(`2026-06-22T${timeOfDay}.000Z`);
  lines.push({
    serviceName,
    severity,
    message,
    timestamp: timestamp.toISOString(),
    metadata: makeMetadata(),
  });
}

// Sort by timestamp ascending
lines.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

// --- Write out as JSON Lines ----------------------------------------------
const outPath = path.join(__dirname, "demo_logs.jsonl");
const content = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
fs.writeFileSync(outPath, content);

console.log(`Wrote ${lines.length} log lines to ${outPath}`);
console.log(`Window: ${WINDOW_START.toISOString()} -> ${WINDOW_END.toISOString()}`);
console.log(`Incident lines: ${INCIDENT_LOGS.length}, noise lines: ${NOISE_LINE_COUNT}`);
