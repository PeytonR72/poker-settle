import { describe, it, expect } from "vitest";
import { parseDollarsToCents, formatCents, sumCents } from "./money";

describe("parseDollarsToCents", () => {
  it("parses whole dollars", () => {
    expect(parseDollarsToCents("20")).toBe(2000);
  });
  it("parses dollars and cents", () => {
    expect(parseDollarsToCents("12.34")).toBe(1234);
  });
  it("parses a leading-dot value", () => {
    expect(parseDollarsToCents(".5")).toBe(50);
  });
  it("rounds to the nearest cent", () => {
    expect(parseDollarsToCents("0.125")).toBe(13);
  });
  it("tolerates surrounding whitespace and $", () => {
    expect(parseDollarsToCents(" $10 ")).toBe(1000);
  });
  it("returns null for empty input", () => {
    expect(parseDollarsToCents("")).toBeNull();
  });
  it("returns null for non-numeric input", () => {
    expect(parseDollarsToCents("abc")).toBeNull();
  });
  it("returns null for negative input", () => {
    expect(parseDollarsToCents("-5")).toBeNull();
  });
});

describe("formatCents", () => {
  it("formats whole dollars", () => {
    expect(formatCents(2000)).toBe("$20.00");
  });
  it("formats cents", () => {
    expect(formatCents(1234)).toBe("$12.34");
  });
  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });
  it("formats negative values", () => {
    expect(formatCents(-150)).toBe("-$1.50");
  });
});

describe("sumCents", () => {
  it("sums an array", () => {
    expect(sumCents([1000, 500, 250])).toBe(1750);
  });
  it("sums an empty array to zero", () => {
    expect(sumCents([])).toBe(0);
  });
});
