import { describe, expect, mock, test } from "bun:test";
import { ApiError, createApiClient } from "./api";

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
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = mock(async (_url: string, init?: RequestInit) => {
      capturedHeaders = Object.fromEntries(
        Object.entries(init?.headers ?? {}),
      );
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const client = createApiClient(
      "http://localhost:9080",
      mockFetch,
    );
    await client.get("/api/jobs");
    expect(capturedHeaders["CF-Access-Client-Id"]).toBeUndefined();
  });

  test("post sends JSON body", async () => {
    let capturedBody = "";
    const mockFetch = mock(async (_url: string, init?: RequestInit) => {
      capturedBody = String(init?.body ?? "");
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
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      if (e instanceof ApiError) {
        expect(e.code).toBe("CONNECTION_ERROR");
      }
    }
  });

  test("remote URL delegates to remoteFetchFn", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    const mockRemoteFetch = mock(
      async (method: string, url: string) => {
        capturedMethod = method;
        capturedUrl = url;
        return { status: 200, data: [{ name: "test-job" }] };
      },
    );

    const client = createApiClient(
      "https://kos.kyrelldixon.com",
      globalThis.fetch,
      mockRemoteFetch,
    );
    const result = await client.get("/api/jobs");
    expect(capturedMethod).toBe("GET");
    expect(capturedUrl).toBe("https://kos.kyrelldixon.com/api/jobs");
    expect(result.data).toEqual([{ name: "test-job" }]);
  });

  test("remote URL passes body to remoteFetchFn", async () => {
    let capturedBody: unknown;
    const mockRemoteFetch = mock(
      async (_method: string, _url: string, body?: unknown) => {
        capturedBody = body;
        return { status: 201, data: { name: "test-job" } };
      },
    );

    const client = createApiClient(
      "https://kos.kyrelldixon.com",
      globalThis.fetch,
      mockRemoteFetch,
    );
    const body = { name: "test-job", schedule: { type: "periodic", seconds: 60 } };
    await client.post("/api/jobs", body);
    expect(capturedBody).toEqual(body);
  });

  test("throws AUTH_ERROR when remoteFetchFn fails with auth error", async () => {
    const mockRemoteFetch = mock(async () => {
      throw new ApiError("AUTH_ERROR", "Could not resolve CF Access credentials");
    });

    const client = createApiClient(
      "https://kos.kyrelldixon.com",
      globalThis.fetch,
      mockRemoteFetch,
    );
    try {
      await client.get("/api/jobs");
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      if (e instanceof ApiError) {
        expect(e.code).toBe("AUTH_ERROR");
      }
    }
  });
});
