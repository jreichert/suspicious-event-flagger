import { beforeEach, describe, expect, it, test, vi } from "vitest";
import * as DB from "./db_client.js";
import { redis } from "./redis";

vi.mock("./redis.js", () => {
  return {
    redis: {
      filterEntriesInSet: vi.fn(),
      sadd: vi.fn(),
      sismember: vi.fn(),
      smismember: vi.fn(),
      zadd: vi.fn(),
    },
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("db_client/addToSet", () => {
  it("should add a value to a set", async () => {
    await DB.addToSet("names", "jake");
    expect(redis.sadd).toBeCalledWith("names", "jake");
  });
});

describe("db_client/addToSortedSet", () => {
  it("should add a value to a sorted set", async () => {
    await DB.addToSortedSet("addresses", 55, "55 Here St.");
    expect(redis.zadd).toBeCalledWith("addresses", 55, "55 Here St.");
  });
});

describe("db_client/isInSet", () => {
  it("should ask Redis if a value is in a set", async () => {
    await DB.isInSet("names", "Jake");
    expect(redis.sismember).toBeCalledWith("names", "Jake");
  });
});

describe("db_client/filterEntriesInSet", () => {
  it("should return a filtered subset of an input set", async () => {
    const bars = ["snickers", "mars", "three musketeers"];
    const filteredBars = ["snickers", "three musketeers"];
    redis.smismember.mockReturnValue(filteredBars);

    const result = await DB.filterEntriesInSet("candy", bars);
    expect(redis.smismember).toBeCalledWith("candy", bars);
    expect(result).toEqual(filteredBars);
  });
});
