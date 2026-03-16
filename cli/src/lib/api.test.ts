import { describe, expect, mock, test } from "bun:test";
import { createApiClient } from "./api";

describe("API client", () => {
  test("builds correct URL from base", async () => {
    let capturedUrl = "";
    const mockFetch = mock(async (url: string) => {
      capturedUrl = url;
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const client = createApiClient(
      "http://localhost:9080",
      mockFetch,
    );
    await client.get("/api/jobs");
    expect(capturedUrl).toBe("http://localhost:9080/api/jobs");
  });

  test("localhost requests have no auth headers", async () => {
    let capturedInit: RequestInit = {};
    const mockFetch = mock(async (_url: string, init?: RequestInit) => {
      capturedInit = init ?? {};
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const client = createApiClient(
      "http://localhost:9080",
      mockFetch,
    );
    await client.get("/api/jobs");
    const headers = capturedInit.headers as Record<string, string>;
    expect(headers["CF-Access-Client-Id"]).toBeUndefined();
  });

  test("post sends JSON body", async () => {
    let capturedBody = "";
    const mockFetch = mock(async (_url: string, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ name: "test" }), { status: 201 });
    });

    const client = createApiClient(
      "http://localhost:9080",
      mockFetch,
    );
    const body = {
      name: "test-job",
      schedule: { type: "periodic", seconds: 60 },
    };
    await client.post("/api/jobs", body);
    expect(JSON.parse(capturedBody)).toEqual(body);
  });

  test("del returns null body for 204", async () => {
    const mockFetch = mock(async () => {
      return new Response(null, { status: 204 });
    });

    const client = createApiClient(
      "http://localhost:9080",
      mockFetch,
    );
    const result = await client.del("/api/jobs/test-job");
    expect(result.status).toBe(204);
    expect(result.data).toBeNull();
  });

  test("throws on connection error", async () => {
    const mockFetch = mock(async () => {
      throw new TypeError("fetch failed");
    });

    const client = createApiClient(
      "http://localhost:9080",
      mockFetch,
    );
    try {
      await client.get("/api/jobs");
      expect(true).toBe(false);
    } catch (e: unknown) {
      expect((e as { code: string }).code).toBe("CONNECTION_ERROR");
    }
  });

  test("remote URL attaches CF Access headers from resolver", async () => {
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = mock(async (_url: string, init?: RequestInit) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify([]), { status: 200 });
    });
    const mockResolver = mock(async () => ({
      "CF-Access-Client-Id": "test-id",
      "CF-Access-Client-Secret": "test-secret",
    }));

    const client = createApiClient(
      "https://kos.kyrelldixon.com",
      mockFetch,
      mockResolver,
    );
    await client.get("/api/jobs");
    expect(capturedHeaders["CF-Access-Client-Id"]).toBe("test-id");
    expect(capturedHeaders["CF-Access-Client-Secret"]).toBe("test-secret");
  });

  test("throws AUTH_ERROR when credential resolver fails", async () => {
    const mockFetch = mock(
      async () => new Response("", { status: 200 }),
    );
    const mockResolver = mock(async () => {
      throw new Error("1Password locked");
    });

    const client = createApiClient(
      "https://kos.kyrelldixon.com",
      mockFetch,
      mockResolver,
    );
    try {
      await client.get("/api/jobs");
      expect(true).toBe(false);
    } catch (e: unknown) {
      expect((e as { code: string }).code).toBe("AUTH_ERROR");
    }
  });
});
