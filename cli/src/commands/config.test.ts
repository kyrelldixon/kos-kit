import { describe, expect, test, mock } from "bun:test";
import { handleGet, handleSet, handleList } from "./config";
import type { ApiClient } from "../lib/api";

function mockClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: mock(async () => ({
      status: 200,
      data: { displayMode: "compact", notifyChannel: "C123" },
    })),
    post: mock(async () => ({ status: 200, data: {} })),
    patch: mock(async () => ({
      status: 200,
      data: { displayMode: "compact", notifyChannel: "C456" },
    })),
    del: mock(async () => ({ status: 204, data: null })),
    ...overrides,
  };
}

describe("config list", () => {
  test("returns all config values", async () => {
    const client = mockClient();
    const result = await handleList(client);
    expect(result.ok).toBe(true);
  });
});

describe("config get", () => {
  test("returns specific config value", async () => {
    const client = mockClient();
    const result = await handleGet(client, "notifyChannel");
    expect(result.ok).toBe(true);
  });
});

describe("config set", () => {
  test("updates config value", async () => {
    const client = mockClient();
    const result = await handleSet(client, "notifyChannel", "C456");
    expect(result.ok).toBe(true);
    expect(client.patch).toHaveBeenCalled();
  });
});
