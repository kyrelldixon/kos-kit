import { homedir } from "node:os";
import { join } from "node:path";

export class ApiError extends Error {
  code: string;
  status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface ApiResponse {
  status: number;
  data: unknown;
}

export interface ApiClient {
  get(path: string): Promise<ApiResponse>;
  post(path: string, body: unknown): Promise<ApiResponse>;
  patch(path: string, body: unknown): Promise<ApiResponse>;
  del(path: string): Promise<ApiResponse>;
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
type RemoteFetchFn = (
  method: string,
  url: string,
  body?: unknown,
) => Promise<ApiResponse>;

function isLocalhost(baseUrl: string): boolean {
  return baseUrl.startsWith("http://localhost");
}

/**
 * For remote URLs, run the entire fetch inside `varlock run` so credentials
 * never leave the subprocess environment. Returns {status, data}.
 */
export async function varlockFetch(
  method: string,
  url: string,
  body?: unknown,
): Promise<ApiResponse> {
  const cliDir = join(homedir(), ".kos-kit", "cli");
  const script = `
    const res = await fetch(${JSON.stringify(url)}, {
      method: ${JSON.stringify(method)},
      headers: {
        "Content-Type": "application/json",
        "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID,
        "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET,
      },
      ${body ? `body: ${JSON.stringify(JSON.stringify(body))},` : ""}
    });
    const data = res.status === 204 ? null : await res.json();
    console.log(JSON.stringify({ status: res.status, data }));
  `;

  const result = Bun.spawnSync(
    ["bunx", "varlock", "run", "--path", cliDir, "--", "bun", "-e", script],
    { stdout: "pipe", stderr: "pipe" },
  );

  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().trim();
    if (stderr.includes("1Password") || stderr.includes("varlock")) {
      throw new ApiError(
        "AUTH_ERROR",
        "Could not resolve CF Access credentials",
      );
    }
    throw new ApiError("CONNECTION_ERROR", stderr || "Remote fetch failed");
  }

  try {
    return JSON.parse(result.stdout.toString().trim()) as ApiResponse;
  } catch {
    throw new ApiError(
      "CONNECTION_ERROR",
      "Invalid response from remote fetch",
    );
  }
}

export function createApiClient(
  baseUrl: string,
  fetchFn: FetchFn = globalThis.fetch,
  remoteFetchFn: RemoteFetchFn = varlockFetch,
): ApiClient {
  async function request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse> {
    const url = `${baseUrl}${path}`;

    // Remote: delegate entire fetch to varlock run subprocess
    if (!isLocalhost(baseUrl)) {
      return remoteFetchFn(method, url, body);
    }

    // Local: direct fetch, no auth needed
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    let response: Response;
    try {
      response = await fetchFn(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError(
        "CONNECTION_ERROR",
        `Could not connect to ${baseUrl}`,
      );
    }

    if (response.status === 204) {
      return { status: 204, data: null };
    }

    const data = await response.json();
    return { status: response.status, data };
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    patch: (path, body) => request("PATCH", path, body),
    del: (path) => request("DELETE", path),
  };
}
