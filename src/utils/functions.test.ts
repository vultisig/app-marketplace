import { describe, it, expect } from "vitest";
import { pricingText } from "./functions";
import type { Currency } from "./currency";

describe("pricingText", () => {
  const baseValue = 1000000; // Example base value for USDC (6 decimals)
  const currency: Currency = "usd";

  describe("one-time pricing", () => {
    it("should format one-time pricing correctly", () => {
      const result = pricingText({
        amount: 10,
        baseValue,
        currency,
        frequency: "",
        type: "once",
      });

      expect(result).toContain("one time installation");
      expect(result).toContain("$");
    });

    it("should handle large amounts", () => {
      const result = pricingText({
        amount: 1000,
        baseValue,
        currency,
        frequency: "",
        type: "once",
      });

      expect(result).toContain("one time installation");
      expect(result).toContain("$");
    });
  });

  describe("per-transaction pricing", () => {
    it("should format per-transaction pricing correctly", () => {
      const result = pricingText({
        amount: 5,
        baseValue,
        currency,
        frequency: "",
        type: "per-tx",
      });

      expect(result).toContain("per transaction");
      expect(result).toContain("$");
    });

    it("should handle decimal amounts with Math.floor", () => {
      const result = pricingText({
        amount: 5.99,
        baseValue,
        currency,
        frequency: "",
        type: "per-tx",
      });

      expect(result).toContain("per transaction");
      // Should not throw BigInt error
    });
  });

  describe("recurring pricing", () => {
    it("should format monthly recurring pricing correctly", () => {
      const result = pricingText({
        amount: 20,
        baseValue,
        currency,
        frequency: "monthly",
        type: "recurring",
      });

      expect(result).toContain("monthly recurring");
      expect(result).toContain("$");
    });

    it("should format yearly recurring pricing correctly", () => {
      const result = pricingText({
        amount: 100,
        baseValue,
        currency,
        frequency: "yearly",
        type: "recurring",
      });

      expect(result).toContain("yearly recurring");
      expect(result).toContain("$");
    });

    it("should handle weekly recurring pricing", () => {
      const result = pricingText({
        amount: 5,
        baseValue,
        currency,
        frequency: "weekly",
        type: "recurring",
      });

      expect(result).toContain("weekly recurring");
    });
  });

  describe("edge cases", () => {
    it("should handle zero amount", () => {
      const result = pricingText({
        amount: 0,
        baseValue,
        currency,
        frequency: "",
        type: "once",
      });

      expect(result).toBeDefined();
      expect(result).toContain("one time installation");
    });

    it("should handle floating-point multiplication results (the bug fix)", () => {
      // This is the actual bug scenario: amount * baseValue = non-integer
      // Example: 694335.9884598098 when amount=0.6943359884598098 and baseValue=1000000
      const result = pricingText({
        amount: 0.6943359884598098,
        baseValue: 1000000,
        currency,
        frequency: "",
        type: "once",
      });

      // Should not throw: "The number X cannot be converted to a BigInt because it is not an integer"
      expect(result).toBeDefined();
      expect(result).toContain("one time installation");
    });

    it("should handle very small amounts", () => {
      const result = pricingText({
        amount: 0.000001,
        baseValue,
        currency,
        frequency: "",
        type: "per-tx",
      });

      expect(result).toBeDefined();
      expect(result).toContain("per transaction");
    });

    it("should handle different currencies", () => {
      const currencies: Currency[] = ["usd", "eur", "gbp", "jpy"];

      currencies.forEach((curr) => {
        const result = pricingText({
          amount: 10,
          baseValue,
          currency: curr,
          frequency: "",
          type: "once",
        });

        expect(result).toBeDefined();
        expect(result).toContain("one time installation");
      });
    });

    it("should return unknown pricing type for invalid type", () => {
      const result = pricingText({
        amount: 10,
        baseValue,
        currency,
        frequency: "",
        type: "invalid" as any,
      });

      expect(result).toBe("Unknown pricing type");
    });
  });

  describe("regression tests for BigInt conversion", () => {
    it("should not throw when amount * baseValue produces a float", () => {
      // These are real-world scenarios that could cause the bug
      const testCases = [
        { amount: 694335.9884598098, baseValue: 1 },
        { amount: 1.5, baseValue: 1000000 },
        { amount: 0.333333, baseValue: 1000000 },
        { amount: 999.999999, baseValue: 1000000 },
      ];

      testCases.forEach(({ amount, baseValue }) => {
        expect(() => {
          pricingText({
            amount,
            baseValue,
            currency,
            frequency: "",
            type: "once",
          });
        }).not.toThrow();
      });
    });

    it("should floor the value before BigInt conversion", () => {
      // When amount * baseValue = 1500000.5, it should use 1500000
      const result = pricingText({
        amount: 1.5000005,
        baseValue: 1000000,
        currency,
        frequency: "",
        type: "once",
      });

      // Should complete without error
      expect(result).toBeDefined();
      expect(result).toContain("one time installation");
    });
  });
});
