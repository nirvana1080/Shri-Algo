import { describe, it, expect, beforeEach } from "vitest";
import { StrategyService, PositionManager, RiskEngine } from "./executionEngine";

describe("StrategyService", () => {
  describe("validateConfig", () => {
    it("should validate a correct strategy config", () => {
      const config = {
        strategy_id: "test_1",
        entry: { type: "signal", value: "price_above_200" },
        legs: [
          {
            instrument: "NIFTY",
            type: "CE",
            action: "BUY",
            strike: "ATM",
            quantity: 50,
            stoploss: 20,
            target: 40,
            trailing_sl: false,
          },
        ],
        overall: { mtm_stoploss: 1000, mtm_target: 2000 },
        reentry: { enabled: true, max_reentries: 2 },
      };

      const result = StrategyService.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject config without entry condition", () => {
      const config = {
        strategy_id: "test_1",
        entry: null as any,
        legs: [],
        overall: { mtm_stoploss: 1000, mtm_target: 2000 },
        reentry: { enabled: false, max_reentries: 0 },
      };

      const result = StrategyService.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject config without legs", () => {
      const config = {
        strategy_id: "test_1",
        entry: { type: "signal", value: "test" },
        legs: [],
        overall: { mtm_stoploss: 1000, mtm_target: 2000 },
        reentry: { enabled: false, max_reentries: 0 },
      };

      const result = StrategyService.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least one leg required");
    });

    it("should reject leg with invalid quantity", () => {
      const config = {
        strategy_id: "test_1",
        entry: { type: "signal", value: "test" },
        legs: [
          {
            instrument: "NIFTY",
            type: "CE",
            action: "BUY",
            strike: "ATM",
            quantity: -50,
            stoploss: 20,
            target: 40,
            trailing_sl: false,
          },
        ],
        overall: { mtm_stoploss: 1000, mtm_target: 2000 },
        reentry: { enabled: false, max_reentries: 0 },
      };

      const result = StrategyService.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("quantity"))).toBe(true);
    });
  });
});

describe("PositionManager", () => {
  describe("calculateUnrealizedPnl", () => {
    it("should calculate P&L for BUY position with profit", () => {
      const pnl = PositionManager.calculateUnrealizedPnl("BUY", 50, 100, 110);
      expect(pnl).toBe(500); // (110 - 100) * 50
    });

    it("should calculate P&L for BUY position with loss", () => {
      const pnl = PositionManager.calculateUnrealizedPnl("BUY", 50, 100, 90);
      expect(pnl).toBe(-500); // (90 - 100) * 50
    });

    it("should calculate P&L for SELL position with profit", () => {
      const pnl = PositionManager.calculateUnrealizedPnl("SELL", 50, 100, 90);
      expect(pnl).toBe(500); // (100 - 90) * 50
    });

    it("should calculate P&L for SELL position with loss", () => {
      const pnl = PositionManager.calculateUnrealizedPnl("SELL", 50, 100, 110);
      expect(pnl).toBe(-500); // (100 - 110) * 50
    });

    it("should return zero P&L when entry and current prices are same", () => {
      const pnl = PositionManager.calculateUnrealizedPnl("BUY", 50, 100, 100);
      expect(pnl).toBe(0);
    });
  });
});

describe("RiskEngine", () => {
  describe("checkStoploss", () => {
    it("should trigger stoploss for BUY position below SL", () => {
      const position = {
        action: "BUY",
        stoploss: 95,
      };

      const result = RiskEngine.checkStoploss(position, 94);
      expect(result.triggered).toBe(true);
      expect(result.reason).toBe("Stoploss hit");
    });

    it("should not trigger stoploss for BUY position above SL", () => {
      const position = {
        action: "BUY",
        stoploss: 95,
      };

      const result = RiskEngine.checkStoploss(position, 96);
      expect(result.triggered).toBe(false);
    });

    it("should trigger stoploss for SELL position above SL", () => {
      const position = {
        action: "SELL",
        stoploss: 105,
      };

      const result = RiskEngine.checkStoploss(position, 106);
      expect(result.triggered).toBe(true);
    });

    it("should not trigger stoploss for SELL position below SL", () => {
      const position = {
        action: "SELL",
        stoploss: 105,
      };

      const result = RiskEngine.checkStoploss(position, 104);
      expect(result.triggered).toBe(false);
    });

    it("should not trigger when no stoploss is set", () => {
      const position = {
        action: "BUY",
        stoploss: null,
      };

      const result = RiskEngine.checkStoploss(position, 50);
      expect(result.triggered).toBe(false);
    });
  });

  describe("checkTarget", () => {
    it("should trigger target for BUY position above target", () => {
      const position = {
        action: "BUY",
        target: 110,
      };

      const result = RiskEngine.checkTarget(position, 111);
      expect(result.triggered).toBe(true);
      expect(result.reason).toBe("Target hit");
    });

    it("should not trigger target for BUY position below target", () => {
      const position = {
        action: "BUY",
        target: 110,
      };

      const result = RiskEngine.checkTarget(position, 109);
      expect(result.triggered).toBe(false);
    });

    it("should trigger target for SELL position below target", () => {
      const position = {
        action: "SELL",
        target: 90,
      };

      const result = RiskEngine.checkTarget(position, 89);
      expect(result.triggered).toBe(true);
    });

    it("should not trigger target for SELL position above target", () => {
      const position = {
        action: "SELL",
        target: 90,
      };

      const result = RiskEngine.checkTarget(position, 91);
      expect(result.triggered).toBe(false);
    });
  });

  describe("checkTrailingStoploss", () => {
    it("should not trigger when trailing SL is disabled", () => {
      const position = {
        action: "BUY",
        trailingSlEnabled: false,
        stoploss: 20,
      };

      const result = RiskEngine.checkTrailingStoploss(position, 100, 105);
      expect(result.triggered).toBe(false);
    });

    it("should trigger for BUY when price falls below trailing SL", () => {
      const position = {
        action: "BUY",
        trailingSlEnabled: true,
        stoploss: 5,
      };

      // Highest price was 105, SL offset is 5, so SL should be at 100
      // Current price 99 should trigger
      const result = RiskEngine.checkTrailingStoploss(position, 99, 105);
      expect(result.triggered).toBe(true);
    });

    it("should not trigger for BUY when price is above trailing SL", () => {
      const position = {
        action: "BUY",
        trailingSlEnabled: true,
        stoploss: 5,
      };

      const result = RiskEngine.checkTrailingStoploss(position, 101, 105);
      expect(result.triggered).toBe(false);
    });
  });
});
