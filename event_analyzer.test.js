import { beforeEach, describe, expect, it, vi } from "vitest";
import { processEvents } from "./event_analyzer.js";
import { store as userStore, contains as userContains } from "./data/user.js";
import { store as ipStore, contains as ipContains } from "./data/ip.js";
import { store as eventStore } from "./data/event.js";
import { containsIp } from "./data/cidr.js";

const event = { username: "bob", source_ip: "206.13.28.12" };

vi.mock("./data/user.js", () => {
  return {
    contains: vi.fn(),
    store: vi.fn(),
  };
});

vi.mock("./data/ip.js", () => {
  return {
    contains: vi.fn(),
    store: vi.fn(),
  };
});

vi.mock("./data/event.js", () => {
  return {
    store: vi.fn(),
  };
});

vi.mock("./data/cidr.js", () => {
  return {
    containsIp: vi.fn(),
    store: vi.fn(),
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("process events", () => {
  // beforeEach( () => {

  // } )
  it("should correctly identify a matching username", async () => {
    await processEvents([event]);
    expect(userContains).toBeCalledWith(event.username);
  });

  it("should persist the username, ip and event in case of a match", async () => {
    userContains.mockReturnValue(event.username);

    await processEvents([event]);
    expect(userStore).toBeCalledWith([event.username]);
    expect(ipStore).toBeCalledWith([event.source_ip]);
    expect(eventStore).toBeCalledWith([event]);
  });

  it("should not persist the event, username, or ip if no matches were found", async () => {
    userContains.mockReturnValue(null);
    ipContains.mockReturnValue(null);

    await processEvents([event]);
    expect(userStore).not.toBeCalled();
    expect(ipStore).not.toBeCalled();
    expect(eventStore).not.toBeCalled();
  });

  it("should correctly identify a matching ip", async () => {
    userContains.mockReturnValue(null);
    ipContains.mockReturnValue(event.source_ip);

    await processEvents([event]);
    expect(ipContains).toBeCalledWith(event.source_ip);
  });

  it("should correctly identify a matching CIDR block", async () => {
    userContains.mockReturnValue(null);
    ipContains.mockReturnValue(null);

    await processEvents([event]);
    expect(containsIp).toBeCalledWith(event.source_ip);
  });
});
