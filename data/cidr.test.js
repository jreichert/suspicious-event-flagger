import { beforeEach, describe, expect, it, vi } from "vitest";
import { del, getAll, store } from "./cidr.js";
import * as CidrUtils from "../util/cidr_utils.js";
import {
  addToSortedSet,
  getFromSortedSet,
  removeFromSet,
} from "./db_client.js";

vi.mock("./db_client.js", () => {
  return {
    addToSortedSet: vi.fn(),
    getFromSortedSet: vi.fn(),
    removeFromSet: vi.fn(),
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("cidr/store", () => {
  it("should store a cidr block in a sorted set, sorted by integer ip", async () => {
    const cidr = "206.13.28.0/24";
    const score = CidrUtils.lowestIpFor(cidr);
    await store("206.13.28.0/24");
    expect(addToSortedSet).toBeCalledWith("cidrs", score, "206.13.28.0/24");
  });

  it("should refuse to store items that are not CIDR blocks", async () => {
    const noncidr = "foo";
    await expect(store(noncidr)).rejects.toThrowError();
  });
});

describe("cidr/getAll", () => {
  it("should retrieve every CIDR block from the config", async () => {
    const bars = ["Snickers", "Three Musketeers"];
    getFromSortedSet.mockReturnValue(bars);
    const result = await getAll();
    expect(result).toEqual(bars);
  });
});

describe("cidr/del", () => {
  it("should remove a CIDR block from the config", async () => {
    const cidr = "206.13.28.0/24";
    await del(cidr);
    expect(removeFromSet).toBeCalledWith("cidrs", cidr);
  });
});
