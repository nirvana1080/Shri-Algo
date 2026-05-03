import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, subscriptions, strategies, orders, positions, trades, riskConfigs, executionLogs } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Subscription helpers
 */
export async function getOrCreateSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  // Create default free subscription
  await db.insert(subscriptions).values({
    userId,
    plan: "free",
    maxActiveStrategies: 2,
  });

  const created = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return created[0];
}

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result[0];
}

/**
 * Strategy helpers
 */
export async function getUserStrategies(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(strategies).where(eq(strategies.userId, userId)).orderBy(desc(strategies.createdAt));
}

export async function getActiveStrategiesCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(strategies).where(
    and(eq(strategies.userId, userId), eq(strategies.status, "active"))
  );
  return result.length;
}

export async function getStrategyById(strategyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(strategies).where(eq(strategies.id, strategyId)).limit(1);
  return result[0];
}

export async function createStrategy(data: {
  userId: number;
  name: string;
  description?: string;
  config: any;
  initialCapital: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(strategies).values({
    userId: data.userId,
    name: data.name,
    description: data.description,
    config: data.config,
    initialCapital: data.initialCapital as any,
    currentCapital: data.initialCapital as any,
    status: "created",
  });

  return result;
}

export async function updateStrategyStatus(strategyId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(strategies).set({ status: status as any }).where(eq(strategies.id, strategyId));
}

/**
 * Order helpers
 */
export async function createOrder(data: {
  strategyId: number;
  userId: number;
  instrument: string;
  orderType: "market" | "limit";
  action: "BUY" | "SELL";
  quantity: number;
  price: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(orders).values({
    strategyId: data.strategyId,
    userId: data.userId,
    instrument: data.instrument,
    orderType: data.orderType,
    action: data.action,
    quantity: data.quantity,
    price: data.price as any,
    status: "created",
  });

  return result;
}

export async function getStrategyOrders(strategyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(orders).where(eq(orders.strategyId, strategyId)).orderBy(desc(orders.createdAt));
}

/**
 * Position helpers
 */
export async function createPosition(data: {
  strategyId: number;
  userId: number;
  instrument: string;
  action: "BUY" | "SELL";
  quantity: number;
  entryPrice: string;
  currentPrice: string;
  stoploss?: string;
  target?: string;
  trailingSlEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(positions).values({
    strategyId: data.strategyId,
    userId: data.userId,
    instrument: data.instrument,
    action: data.action,
    quantity: data.quantity,
    entryPrice: data.entryPrice as any,
    currentPrice: data.currentPrice as any,
    stoploss: data.stoploss as any,
    target: data.target as any,
    trailingSlEnabled: data.trailingSlEnabled ?? false,
    status: "open",
  });

  return result;
}

export async function getOpenPositions(strategyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(positions).where(
    and(eq(positions.strategyId, strategyId), eq(positions.status, "open"))
  );
}

export async function updatePositionPrice(positionId: number, currentPrice: string, unrealizedPnl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(positions).set({
    currentPrice: currentPrice as any,
    unrealizedPnl: unrealizedPnl as any,
  }).where(eq(positions.id, positionId));
}

export async function closePosition(positionId: number, realizedPnl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(positions).set({
    status: "closed",
    realizedPnl: realizedPnl as any,
    closedAt: new Date(),
  }).where(eq(positions.id, positionId));
}

/**
 * Trade helpers
 */
export async function createTrade(data: {
  strategyId: number;
  userId: number;
  instrument: string;
  entryOrderId: number;
  action: "BUY" | "SELL";
  quantity: number;
  entryPrice: string;
  entryAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(trades).values({
    strategyId: data.strategyId,
    userId: data.userId,
    instrument: data.instrument,
    entryOrderId: data.entryOrderId,
    action: data.action,
    quantity: data.quantity,
    entryPrice: data.entryPrice as any,
    entryAt: data.entryAt,
  });

  return result;
}

export async function getStrategyTrades(strategyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(trades).where(eq(trades.strategyId, strategyId)).orderBy(desc(trades.entryAt));
}

export async function closeTrade(tradeId: number, data: {
  exitOrderId?: number;
  exitPrice: string;
  exitAt: Date;
  pnl: string;
  pnlPercent: string;
  exitReason: "target" | "stoploss" | "manual" | "trailing_sl" | "mtm_limit";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(trades).set({
    exitOrderId: data.exitOrderId,
    exitPrice: data.exitPrice as any,
    exitAt: data.exitAt,
    pnl: data.pnl as any,
    pnlPercent: data.pnlPercent as any,
    exitReason: data.exitReason,
  }).where(eq(trades.id, tradeId));
}

/**
 * Risk Config helpers
 */
export async function getOrCreateRiskConfig(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(riskConfigs).where(eq(riskConfigs.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  // Create default risk config
  await db.insert(riskConfigs).values({
    userId,
    maxDrawdownPercent: "10",
    maxOpenPositions: 5,
  });

  const created = await db.select().from(riskConfigs).where(eq(riskConfigs.userId, userId)).limit(1);
  return created[0];
}

export async function updateRiskConfig(userId: number, data: {
  maxDrawdownPercent?: string;
  dailyLossLimit?: string;
  maxPositionSize?: string;
  maxOpenPositions?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(riskConfigs).set(data as any).where(eq(riskConfigs.userId, userId));
}

/**
 * Execution Log helpers
 */
export async function logExecution(data: {
  strategyId: number;
  userId: number;
  eventType: string;
  message: string;
  metadata?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(executionLogs).values({
    strategyId: data.strategyId,
    userId: data.userId,
    eventType: data.eventType,
    message: data.message,
    metadata: data.metadata,
  });
}

export async function getStrategyExecutionLogs(strategyId: number, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(executionLogs)
    .where(eq(executionLogs.strategyId, strategyId))
    .orderBy(desc(executionLogs.createdAt))
    .limit(limit);
}
