import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getOrCreateSubscription,
  getActiveStrategiesCount,
  getUserStrategies,
  getStrategyById,
  createStrategy,
  updateStrategyStatus,
  getStrategyOrders,
  getOpenPositions,
  getStrategyTrades,
  getOrCreateRiskConfig,
  updateRiskConfig,
  getStrategyExecutionLogs,
} from "./db";
import { StrategyService } from "./executionEngine";

/**
 * Plan gating helper
 */
const checkPaidPlan = async (userId: number) => {
  const subscription = await getOrCreateSubscription(userId);
  if (subscription.plan !== "paid") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature requires a paid plan. Please upgrade to continue.",
    });
  }
  return subscription;
};

/**
 * Check active strategy limit
 */
const checkActiveStrategyLimit = async (userId: number) => {
  const subscription = await getOrCreateSubscription(userId);
  const activeCount = await getActiveStrategiesCount(userId);

  if (activeCount >= subscription.maxActiveStrategies) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You have reached the limit of ${subscription.maxActiveStrategies} active strategies for your plan. Please complete or stop an existing strategy.`,
    });
  }
};

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * Subscription & Plan Management
   */
  subscription: router({
    getMyPlan: protectedProcedure.query(async ({ ctx }) => {
      const subscription = await getOrCreateSubscription(ctx.user.id);
      const activeCount = await getActiveStrategiesCount(ctx.user.id);

      return {
        plan: subscription.plan,
        maxActiveStrategies: subscription.maxActiveStrategies,
        activeStrategiesCount: activeCount,
        canCreateStrategy: activeCount < subscription.maxActiveStrategies,
      };
    }),

    upgradeToPaid: protectedProcedure.mutation(async ({ ctx }) => {
      // In a real app, this would integrate with Stripe
      // For now, just update the subscription
      await getOrCreateSubscription(ctx.user.id);
      // TODO: Implement actual payment processing
      return { success: true, message: "Upgrade initiated" };
    }),
  }),

  /**
   * Strategy Management
   */
  strategy: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserStrategies(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          config: z.object({
            strategy_id: z.string().optional(),
            entry: z.object({ type: z.string(), value: z.string() }),
            legs: z.array(z.any()),
            overall: z.object({ mtm_stoploss: z.number(), mtm_target: z.number() }),
            reentry: z.object({ enabled: z.boolean(), max_reentries: z.number() }),
          }),
          initialCapital: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check plan limit
        await checkActiveStrategyLimit(ctx.user.id);

        // Validate config
        const validation = StrategyService.validateConfig(input.config as any);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid strategy config: ${validation.errors.join(", ")}`,
          });
        }

        const result = await createStrategy({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          config: input.config,
          initialCapital: input.initialCapital,
        });

        return { success: true, message: "Strategy created successfully" };
      }),

    get: protectedProcedure
      .input(z.object({ strategyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const strategy = await getStrategyById(input.strategyId);

        if (!strategy || strategy.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Strategy not found",
          });
        }

        return strategy;
      }),

    activate: protectedProcedure
      .input(z.object({ strategyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const strategy = await getStrategyById(input.strategyId);

        if (!strategy || strategy.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Strategy not found",
          });
        }

        // Check active limit before activating
        await checkActiveStrategyLimit(ctx.user.id);

        await updateStrategyStatus(input.strategyId, "active");

        return { success: true };
      }),

    stop: protectedProcedure
      .input(z.object({ strategyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const strategy = await getStrategyById(input.strategyId);

        if (!strategy || strategy.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Strategy not found",
          });
        }

        await updateStrategyStatus(input.strategyId, "stopped");

        return { success: true };
      }),
  }),

  /**
   * Orders & Trades
   */
  orders: router({
    getStrategyOrders: protectedProcedure
      .input(z.object({ strategyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const strategy = await getStrategyById(input.strategyId);

        if (!strategy || strategy.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Strategy not found",
          });
        }

        return await getStrategyOrders(input.strategyId);
      }),
  }),

  /**
   * Positions & P&L
   */
  positions: router({
    getOpenPositions: protectedProcedure
      .input(z.object({ strategyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const strategy = await getStrategyById(input.strategyId);

        if (!strategy || strategy.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Strategy not found",
          });
        }

        return await getOpenPositions(input.strategyId);
      }),
  }),

  /**
   * Trades
   */
  trades: router({
    getStrategyTrades: protectedProcedure
      .input(z.object({ strategyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const strategy = await getStrategyById(input.strategyId);

        if (!strategy || strategy.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Strategy not found",
          });
        }

        return await getStrategyTrades(input.strategyId);
      }),
  }),

  /**
   * Risk Management
   */
  riskConfig: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getOrCreateRiskConfig(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          maxDrawdownPercent: z.string().optional(),
          dailyLossLimit: z.string().optional(),
          maxPositionSize: z.string().optional(),
          maxOpenPositions: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateRiskConfig(ctx.user.id, input);
        return { success: true };
      }),
  }),

  /**
   * Dashboard
   */
  dashboard: router({
    getPortfolioOverview: protectedProcedure.query(async ({ ctx }) => {
      const strategies = await getUserStrategies(ctx.user.id);

      let totalCapital = 0;
      let totalRealizedPnl = 0;
      let totalUnrealizedPnl = 0;
      let openPositionsCount = 0;

      for (const strategy of strategies) {
        totalCapital += parseFloat(strategy.initialCapital.toString());
        totalRealizedPnl += parseFloat(strategy.realizedPnl.toString());
        totalUnrealizedPnl += parseFloat(strategy.unrealizedPnl.toString());

        const openPositions = await getOpenPositions(strategy.id);
        openPositionsCount += openPositions.length;
      }

      const totalPnl = totalRealizedPnl + totalUnrealizedPnl;
      const pnlPercent = totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0;

      return {
        totalCapital,
        totalRealizedPnl,
        totalUnrealizedPnl,
        totalPnl,
        pnlPercent,
        openPositionsCount,
        activeStrategiesCount: await getActiveStrategiesCount(ctx.user.id),
      };
    }),

    getExecutionLogs: protectedProcedure
      .input(z.object({ strategyId: z.number(), limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        const strategy = await getStrategyById(input.strategyId);

        if (!strategy || strategy.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Strategy not found",
          });
        }

        return await getStrategyExecutionLogs(input.strategyId, input.limit);
      }),
  }),

  /**
   * Admin Panel (Owner only)
   */
  admin: router({
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // TODO: Implement admin user listing
      return [];
    }),

    getPlatformStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // TODO: Implement platform statistics
      return {
        totalUsers: 0,
        totalStrategies: 0,
        totalTrades: 0,
        totalPnl: 0,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
