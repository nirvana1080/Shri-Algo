import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, foreignKey, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Subscription/Plan table: tracks user's plan tier (free or paid)
 */
export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    plan: mysqlEnum("plan", ["free", "paid"]).default("free").notNull(),
    maxActiveStrategies: int("maxActiveStrategies").default(2).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Strategies table: user-defined trading strategies
 */
export const strategies = mysqlTable(
  "strategies",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["created", "ready", "active", "running", "completed", "stopped"]).default("created").notNull(),
    config: json("config").notNull(), // Stores strategy JSON config
    initialCapital: decimal("initialCapital", { precision: 15, scale: 2 }).notNull(),
    currentCapital: decimal("currentCapital", { precision: 15, scale: 2 }).notNull(),
    realizedPnl: decimal("realizedPnl", { precision: 15, scale: 2 }).default("0").notNull(),
    unrealizedPnl: decimal("unrealizedPnl", { precision: 15, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
    index("idx_user_status").on(table.userId, table.status),
  ]
);

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = typeof strategies.$inferInsert;

/**
 * Orders table: all orders placed (market and limit)
 */
export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    strategyId: int("strategyId").notNull(),
    userId: int("userId").notNull(),
    instrument: varchar("instrument", { length: 50 }).notNull(),
    orderType: mysqlEnum("orderType", ["market", "limit"]).notNull(),
    action: mysqlEnum("action", ["BUY", "SELL"]).notNull(),
    quantity: int("quantity").notNull(),
    price: decimal("price", { precision: 15, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["created", "queued", "executed", "closed", "cancelled"]).default("created").notNull(),
    filledQuantity: int("filledQuantity").default(0).notNull(),
    filledPrice: decimal("filledPrice", { precision: 15, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    executedAt: timestamp("executedAt"),
    closedAt: timestamp("closedAt"),
  },
  (table) => [
    foreignKey({ columns: [table.strategyId], foreignColumns: [strategies.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
    index("idx_strategy_status").on(table.strategyId, table.status),
  ]
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Positions table: open and closed positions
 */
export const positions = mysqlTable(
  "positions",
  {
    id: int("id").autoincrement().primaryKey(),
    strategyId: int("strategyId").notNull(),
    userId: int("userId").notNull(),
    instrument: varchar("instrument", { length: 50 }).notNull(),
    action: mysqlEnum("action", ["BUY", "SELL"]).notNull(),
    quantity: int("quantity").notNull(),
    entryPrice: decimal("entryPrice", { precision: 15, scale: 2 }).notNull(),
    currentPrice: decimal("currentPrice", { precision: 15, scale: 2 }).notNull(),
    unrealizedPnl: decimal("unrealizedPnl", { precision: 15, scale: 2 }).default("0").notNull(),
    realizedPnl: decimal("realizedPnl", { precision: 15, scale: 2 }).default("0").notNull(),
    stoploss: decimal("stoploss", { precision: 15, scale: 2 }),
    target: decimal("target", { precision: 15, scale: 2 }),
    trailingSlEnabled: boolean("trailingSlEnabled").default(false).notNull(),
    trailingSlValue: decimal("trailingSlValue", { precision: 15, scale: 2 }),
    status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    closedAt: timestamp("closedAt"),
  },
  (table) => [
    foreignKey({ columns: [table.strategyId], foreignColumns: [strategies.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
    index("idx_strategy_status").on(table.strategyId, table.status),
  ]
);

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * Trades table: completed trades with full lifecycle
 */
export const trades = mysqlTable(
  "trades",
  {
    id: int("id").autoincrement().primaryKey(),
    strategyId: int("strategyId").notNull(),
    userId: int("userId").notNull(),
    instrument: varchar("instrument", { length: 50 }).notNull(),
    entryOrderId: int("entryOrderId").notNull(),
    exitOrderId: int("exitOrderId"),
    action: mysqlEnum("action", ["BUY", "SELL"]).notNull(),
    quantity: int("quantity").notNull(),
    entryPrice: decimal("entryPrice", { precision: 15, scale: 2 }).notNull(),
    exitPrice: decimal("exitPrice", { precision: 15, scale: 2 }),
    pnl: decimal("pnl", { precision: 15, scale: 2 }).default("0").notNull(),
    pnlPercent: decimal("pnlPercent", { precision: 10, scale: 4 }).default("0").notNull(),
    exitReason: mysqlEnum("exitReason", ["target", "stoploss", "manual", "trailing_sl", "mtm_limit"]),
    entryAt: timestamp("entryAt").notNull(),
    exitAt: timestamp("exitAt"),
  },
  (table) => [
    foreignKey({ columns: [table.strategyId], foreignColumns: [strategies.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.entryOrderId], foreignColumns: [orders.id] }).onDelete("restrict"),
    index("idx_strategy_entry").on(table.strategyId, table.entryAt),
  ]
);

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Risk Configs table: user-defined risk management rules
 */
export const riskConfigs = mysqlTable(
  "riskConfigs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    maxDrawdownPercent: decimal("maxDrawdownPercent", { precision: 5, scale: 2 }).default("10").notNull(),
    dailyLossLimit: decimal("dailyLossLimit", { precision: 15, scale: 2 }),
    maxPositionSize: decimal("maxPositionSize", { precision: 15, scale: 2 }),
    maxOpenPositions: int("maxOpenPositions").default(5).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  ]
);

export type RiskConfig = typeof riskConfigs.$inferSelect;
export type InsertRiskConfig = typeof riskConfigs.$inferInsert;

/**
 * Execution Logs table: audit trail of all engine decisions
 */
export const executionLogs = mysqlTable(
  "executionLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    strategyId: int("strategyId").notNull(),
    userId: int("userId").notNull(),
    eventType: varchar("eventType", { length: 50 }).notNull(), // entry_triggered, exit_triggered, sl_hit, target_hit, etc.
    message: text("message").notNull(),
    metadata: json("metadata"), // Additional context
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.strategyId], foreignColumns: [strategies.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
    index("idx_strategy_event").on(table.strategyId, table.eventType),
  ]
);

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;

/**
 * Relations for Drizzle ORM
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  strategies: many(strategies),
  orders: many(orders),
  positions: many(positions),
  trades: many(trades),
  riskConfig: one(riskConfigs, {
    fields: [users.id],
    references: [riskConfigs.userId],
  }),
  executionLogs: many(executionLogs),
}));

export const strategiesRelations = relations(strategies, ({ one, many }) => ({
  user: one(users, {
    fields: [strategies.userId],
    references: [users.id],
  }),
  orders: many(orders),
  positions: many(positions),
  trades: many(trades),
  executionLogs: many(executionLogs),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  strategy: one(strategies, {
    fields: [orders.strategyId],
    references: [strategies.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  strategy: one(strategies, {
    fields: [positions.strategyId],
    references: [strategies.id],
  }),
  user: one(users, {
    fields: [positions.userId],
    references: [users.id],
  }),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  strategy: one(strategies, {
    fields: [trades.strategyId],
    references: [strategies.id],
  }),
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
  entryOrder: one(orders, {
    fields: [trades.entryOrderId],
    references: [orders.id],
  }),
}));

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
  strategy: one(strategies, {
    fields: [executionLogs.strategyId],
    references: [strategies.id],
  }),
  user: one(users, {
    fields: [executionLogs.userId],
    references: [users.id],
  }),
}));
