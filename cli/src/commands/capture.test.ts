import { describe, expect, test, mock } from "bun:test";
import { handleCapture, parseBatchFile } from "./capture";
import type { ApiClient } from "../lib/api";

function mockClient(overrides: Partial<ApiClient> = {}): ApiClient {
	return {
		get: mock(async () => ({ status: 200, data: {} })),
		post: mock(async () => ({
			status: 202,
			data: {
				captured: [
					{ captureKey: "https://example.com", type: "article", mode: "triage" },
				],
			},
		})),
		patch: mock(async () => ({ status: 200, data: {} })),
		del: mock(async () => ({ status: 204, data: null })),
		...overrides,
	};
}

describe("handleCapture", () => {
	test("sends single URL", async () => {
		const client = mockClient();
		const result = await handleCapture(client, {
			urls: ["https://example.com"],
		});
		expect(result.ok).toBe(true);
		expect(client.post).toHaveBeenCalled();
	});

	test("sends file path", async () => {
		const client = mockClient();
		const result = await handleCapture(client, {
			filePath: "/Users/me/doc.md",
		});
		expect(result.ok).toBe(true);
	});

	test("sends mode flag", async () => {
		const client = mockClient();
		await handleCapture(client, {
			urls: ["https://example.com"],
			mode: "full",
		});
		const postCall = (client.post as ReturnType<typeof mock>).mock.calls[0];
		const body = postCall[1];
		expect(typeof body === "object" && body !== null && "mode" in body ? (body as Record<string, unknown>).mode : undefined).toBe("full");
	});

	test("returns VALIDATION_ERROR on 400", async () => {
		const client = mockClient({
			post: mock(async () => ({
				status: 400,
				data: { error: "Invalid URL format" },
			})),
		});
		const result = await handleCapture(client, {
			urls: ["not-a-url"],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("VALIDATION_ERROR");
		}
	});

	test("returns API_ERROR on unexpected status", async () => {
		const client = mockClient({
			post: mock(async () => ({ status: 500, data: { error: "Server error" } })),
		});
		const result = await handleCapture(client, {
			urls: ["https://example.com"],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("API_ERROR");
		}
	});

	test("sends destination when provided", async () => {
		const client = mockClient();
		await handleCapture(client, {
			urls: ["https://example.com"],
			destination: { chatId: "C123", threadId: "ts456" },
		});
		const postCall = (client.post as ReturnType<typeof mock>).mock.calls[0];
		const body = postCall[1];
		expect(body).toHaveProperty("destination", { chatId: "C123", threadId: "ts456" });
	});

	test("omits destination when not provided", async () => {
		const client = mockClient();
		await handleCapture(client, {
			urls: ["https://example.com"],
		});
		const postCall = (client.post as ReturnType<typeof mock>).mock.calls[0];
		const body = postCall[1];
		expect(body).not.toHaveProperty("destination");
	});
});

describe("parseBatchFile", () => {
	test("parses URLs from text", () => {
		const urls = parseBatchFile("https://a.com\nhttps://b.com\n# comment\n\n");
		expect(urls).toEqual(["https://a.com", "https://b.com"]);
	});

	test("skips comments and empty lines", () => {
		const urls = parseBatchFile("# header\n\nhttps://a.com");
		expect(urls).toEqual(["https://a.com"]);
	});
});
