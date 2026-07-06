import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  vector,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  serviceName: text("service_name").notNull(),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  embedding: vector("embedding", { dimensions: 384 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  rootCause: text("root_cause"),
  relatedLogIds: jsonb("related_log_ids"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id")
    .notNull()
    .references(() => incidents.id),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  dispatched: boolean("dispatched").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
