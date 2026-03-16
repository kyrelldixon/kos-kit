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
type CredentialResolver = () => Promise<Record<string, string>>;

function isLocalhost(baseUrl: string): boolean {
  return baseUrl.startsWith("http://localhost");
}

export async function resolveCfAccessHeaders(): Promise<
  Record<string, string>
> {
  try {
    const cliDir = new URL("../../", import.meta.url).pathname;
    const clientId = await Bun.$`bunx varlock printenv --path ${cliDir} CF_ACCESS_CLIENT_ID`
      .text()
      .then((s) => s.trim());
    const clientSecret = await Bun.$`bunx varlock printenv --path ${cliDir} CF_ACCESS_CLIENT_SECRET`
      .text()
      .then((s) => s.trim());

    if (!clientId || !clientSecret) {
      throw new Error("Empty credentials");
    }

    return {
      "CF-Access-Client-Id": clientId,
      "CF-Access-Client-Secret": clientSecret,
    };
  } catch {
    throw new ApiError(
      "AUTH_ERROR",
      "Could not resolve CF Access credentials",
    );
  }
}

export function createApiClient(
  baseUrl: string,
  fetchFn: FetchFn = globalThis.fetch,
  credentialResolver: CredentialResolver = resolveCfAccessHeaders,
): ApiClient {
  async function request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (!isLocalhost(baseUrl)) {
      try {
        const cfHeaders = await credentialResolver();
        Object.assign(headers, cfHeaders);
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "AUTH_ERROR",
          "Could not resolve CF Access credentials",
        );
      }
    }

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
