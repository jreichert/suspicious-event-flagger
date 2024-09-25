import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidCidr, lowestIpFor } from "./cidr_utils.js";

describe("isValidCidr", () => {
  it("should recognize a valid CIDR", () => {
    const cidr = "206.13.28.0/24";
    expect(isValidCidr(cidr)).toBe(true);
  });

  it("should handle nulls properly", () => {
    expect(isValidCidr(null)).toBe(false);
  });

  it("should reject ip addresses", () => {
    expect(isValidCidr("2016.13.28.12")).toBe(false);
  });

  it("should reject random strings", () => {
    expect(isValidCidr("fubar")).toBe(false);
  });

  it("should reject malformed CIDR blocks", () => {
    expect(isValidCidr("206.13.28.0/foo")).toBe(false);
  });
});

describe("lowestIpFor", () => {
  it("should correctly calculate the lowest IP of a CIDR block", () => {
    const lowest = 206 * 16777216 + 13 * 65536 + 28 * 256;
    expect(lowestIpFor("206.13.28.0/24")).toEqual(lowest);
  });
});
