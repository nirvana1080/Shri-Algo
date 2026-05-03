import { getDb, createOrder, createPosition, getOpenPositions, updatePositionPrice, closePosition, createTrade, closeTrade, logExecution, getStrategyById, updateStrategyStatus } from "./db";

/**
 * Core Execution Engine
 * Handles strategy evaluation, order execution, position tracking, and risk management
 */

export interface StrategyConfig {
  strategy_id: string;
  entry: {
    type: "time" | "signal";
    value: string;
  };
  legs: Array<{
    instrument: string;
    type: "CE" | "PE";
    action: "BUY" | "SELL";
    strike: "ATM" | "OTM" | string;
    quantity: number;
    stoploss: number;
    target: number;
    trailing_sl: boolean;
  }>;
  overall: {
    mtm_stoploss: number;
    mtm_target: number;
  };
  reentry: {
    enabled: boolean;
    max_reentries: number;
  };
}

export interface MarketPrice {
  instrument: string;
  ltp: number;
  timestamp: Date;
}

/**
 * Strategy Service: Manages strategy configuration and state
 */
export class StrategyService {
  static parseConfig(configJson: any): StrategyConfig {
    return configJson as StrategyConfig;
  }

  static validateConfig(config: StrategyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.entry || !config.entry.type) errors.push("Entry condition required");
    if (!config.legs || config.legs.length === 0) errors.push("At least one leg required");
    if (!config.overall) errors.push("Overall risk config required");

    config.legs.forEach((leg, idx) => {
      if (!leg.instrument) errors.push(`Leg ${idx}: instrument required`);
      if (!leg.action) errors.push(`Leg ${idx}: action (BUY/SELL) required`);
      if (leg.quantity <= 0) errors.push(`Leg ${idx}: quantity must be positive`);
      if (leg.stoploss < 0) errors.push(`Leg ${idx}: stoploss must be non-negative`);
      if (leg.target < 0) errors.push(`Leg ${idx}: target must be non-negative`);
    });

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Order Manager: Handles order lifecycle
 */
export class OrderManager {
  static async placeOrder(data: {
    strategyId: number;
    userId: number;
    instrument: string;
    orderType: "market" | "limit";
    action: "BUY" | "SELL";
    quantity: number;
    price: number;
  }) {
    try {
      const result = await createOrder({
        strategyId: data.strategyId,
        userId: data.userId,
        instrument: data.instrument,
        orderType: data.orderType,
        action: data.action,
        quantity: data.quantity,
        price: data.price.toString(),
      });

      await logExecution({
        strategyId: data.strategyId,
        userId: data.userId,
        eventType: "order_created",
        message: `Order placed: ${data.action} ${data.quantity} ${data.instrument} @ ${data.price}`,
        metadata: { orderType: data.orderType, price: data.price },
      });

      return result;
    } catch (error) {
      console.error("[OrderManager] Failed to place order:", error);
      throw error;
    }
  }

  static async executeOrder(orderId: number, filledPrice: number, filledQuantity: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      const { orders: ordersTable } = await import("../drizzle/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      await db.update(ordersTable).set({
        status: "executed",
        filledPrice: filledPrice.toString() as any,
        filledQuantity,
        executedAt: new Date(),
      }).where(eqFn(ordersTable.id, orderId));

      return { success: true };
    } catch (error) {
      console.error("[OrderManager] Failed to execute order:", error);
      throw error;
    }
  }
}

/**
 * Position Manager: Tracks and updates positions
 */
export class PositionManager {
  static calculateUnrealizedPnl(
    action: "BUY" | "SELL",
    quantity: number,
    entryPrice: number,
    currentPrice: number
  ): number {
    if (action === "BUY") {
      return (currentPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - currentPrice) * quantity;
    }
  }

  static async openPosition(data: {
    strategyId: number;
    userId: number;
    instrument: string;
    action: "BUY" | "SELL";
    quantity: number;
    entryPrice: number;
    stoploss?: number;
    target?: number;
    trailingSlEnabled?: boolean;
  }) {
    try {
      const result = await createPosition({
        strategyId: data.strategyId,
        userId: data.userId,
        instrument: data.instrument,
        action: data.action,
        quantity: data.quantity,
        entryPrice: data.entryPrice.toString(),
        currentPrice: data.entryPrice.toString(),
        stoploss: data.stoploss?.toString(),
        target: data.target?.toString(),
        trailingSlEnabled: data.trailingSlEnabled,
      });

      await logExecution({
        strategyId: data.strategyId,
        userId: data.userId,
        eventType: "position_opened",
        message: `Position opened: ${data.action} ${data.quantity} ${data.instrument} @ ${data.entryPrice}`,
        metadata: {
          quantity: data.quantity,
          entryPrice: data.entryPrice,
          stoploss: data.stoploss,
          target: data.target,
        },
      });

      return result;
    } catch (error) {
      console.error("[PositionManager] Failed to open position:", error);
      throw error;
    }
  }

  static async updatePositions(strategyId: number, marketPrices: Map<string, number>) {
    try {
      const openPositions = await getOpenPositions(strategyId);

      for (const position of openPositions) {
        const currentPrice = marketPrices.get(position.instrument);
        if (!currentPrice) continue;

        const unrealizedPnl = this.calculateUnrealizedPnl(
          position.action,
          position.quantity,
          parseFloat(position.entryPrice.toString()),
          currentPrice
        );

        await updatePositionPrice(
          position.id,
          currentPrice.toString(),
          unrealizedPnl.toString()
        );
      }
    } catch (error) {
      console.error("[PositionManager] Failed to update positions:", error);
      throw error;
    }
  }
}

/**
 * Risk Engine: Evaluates and enforces risk rules
 */
export class RiskEngine {
  static checkStoploss(
    position: any,
    currentPrice: number
  ): { triggered: boolean; reason?: string } {
    if (!position.stoploss) return { triggered: false };

    const slPrice = parseFloat(position.stoploss.toString());

    if (position.action === "BUY" && currentPrice <= slPrice) {
      return { triggered: true, reason: "Stoploss hit" };
    } else if (position.action === "SELL" && currentPrice >= slPrice) {
      return { triggered: true, reason: "Stoploss hit" };
    }

    return { triggered: false };
  }

  static checkTarget(
    position: any,
    currentPrice: number
  ): { triggered: boolean; reason?: string } {
    if (!position.target) return { triggered: false };

    const targetPrice = parseFloat(position.target.toString());

    if (position.action === "BUY" && currentPrice >= targetPrice) {
      return { triggered: true, reason: "Target hit" };
    } else if (position.action === "SELL" && currentPrice <= targetPrice) {
      return { triggered: true, reason: "Target hit" };
    }

    return { triggered: false };
  }

  static checkTrailingStoploss(
    position: any,
    currentPrice: number,
    highestPrice: number
  ): { triggered: boolean; newSlPrice?: number } {
    if (!position.trailingSlEnabled || !position.stoploss) {
      return { triggered: false };
    }

    const slOffset = parseFloat(position.stoploss.toString());

    if (position.action === "BUY") {
      const newSl = highestPrice - slOffset;
      if (currentPrice <= newSl) {
        return { triggered: true, newSlPrice: newSl };
      }
    } else if (position.action === "SELL") {
      const newSl = highestPrice + slOffset;
      if (currentPrice >= newSl) {
        return { triggered: true, newSlPrice: newSl };
      }
    }

    return { triggered: false };
  }

  static async evaluatePositionRisks(
    strategyId: number,
    userId: number,
    positions: any[],
    marketPrices: Map<string, number>
  ) {
    const exitPositions: Array<{ positionId: number; reason: "target" | "stoploss" | "trailing_sl"; price: number }> = [];

    for (const position of positions) {
      const currentPrice = marketPrices.get(position.instrument);
      if (!currentPrice) continue;

      // Check target first (priority)
      const targetCheck = this.checkTarget(position, currentPrice);
      if (targetCheck.triggered) {
        exitPositions.push({
          positionId: position.id,
          reason: "target",
          price: currentPrice,
        });
        await logExecution({
          strategyId,
          userId,
          eventType: "target_hit",
          message: `Target hit for ${position.instrument}`,
          metadata: { price: currentPrice },
        });
        continue;
      }

      // Check stoploss
      const slCheck = this.checkStoploss(position, currentPrice);
      if (slCheck.triggered) {
        exitPositions.push({
          positionId: position.id,
          reason: "stoploss",
          price: currentPrice,
        });
        await logExecution({
          strategyId,
          userId,
          eventType: "stoploss_hit",
          message: `Stoploss hit for ${position.instrument}`,
          metadata: { price: currentPrice },
        });
        continue;
      }

      // Check trailing stoploss
      const tslCheck = this.checkTrailingStoploss(position, currentPrice, currentPrice);
      if (tslCheck.triggered) {
        exitPositions.push({
          positionId: position.id,
          reason: "trailing_sl",
          price: currentPrice,
        });
        await logExecution({
          strategyId,
          userId,
          eventType: "trailing_sl_hit",
          message: `Trailing stoploss hit for ${position.instrument}`,
          metadata: { price: currentPrice },
        });
      }
    }

    return exitPositions;
  }
}

/**
 * Execution Loop: Main strategy evaluation loop
 */
export class ExecutionLoop {
  static async evaluateStrategy(
    strategyId: number,
    userId: number,
    marketPrices: Map<string, number>
  ) {
    try {
      const strategy = await getStrategyById(strategyId);
      if (!strategy || strategy.status !== "active") return;

      // Parse strategy config
      const config = StrategyService.parseConfig(strategy.config);
      const validation = StrategyService.validateConfig(config);
      if (!validation.valid) {
        await logExecution({
          strategyId,
          userId,
          eventType: "validation_error",
          message: `Strategy validation failed: ${validation.errors.join(", ")}`,
        });
        return;
      }

      // Update all positions with current market prices
      await PositionManager.updatePositions(strategyId, marketPrices);

      // Get open positions and evaluate risks
      const openPositions = await getOpenPositions(strategyId);
      const exitPositions = await RiskEngine.evaluatePositionRisks(
        strategyId,
        userId,
        openPositions,
        marketPrices
      );

      // Close positions that hit risk limits
      for (const exit of exitPositions) {
        const position = openPositions.find((p) => p.id === exit.positionId);
        if (position) {
          const unrealizedPnl = PositionManager.calculateUnrealizedPnl(
            position.action,
            position.quantity,
            parseFloat(position.entryPrice.toString()),
            exit.price
          );

          await closePosition(exit.positionId, unrealizedPnl.toString());

          // Create trade record
          await createTrade({
            strategyId,
            userId,
            instrument: position.instrument,
            entryOrderId: 0, // Would be linked to actual order
            action: position.action,
            quantity: position.quantity,
            entryPrice: position.entryPrice.toString(),
            entryAt: position.createdAt,
          });

          await closeTrade(0, {
            // Would be actual trade ID
            exitPrice: exit.price.toString(),
            exitAt: new Date(),
            pnl: unrealizedPnl.toString(),
            pnlPercent: ((unrealizedPnl / (parseFloat(position.entryPrice.toString()) * position.quantity)) * 100).toString(),
            exitReason: exit.reason,
          });
        }
      }
    } catch (error) {
      console.error("[ExecutionLoop] Error evaluating strategy:", error);
      await logExecution({
        strategyId,
        userId,
        eventType: "execution_error",
        message: `Execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  static async runExecutionCycle(activeStrategies: Array<{ id: number; userId: number }>, marketPrices: Map<string, number>) {
    for (const strategy of activeStrategies) {
      await this.evaluateStrategy(strategy.id, strategy.userId, marketPrices);
    }
  }
}
