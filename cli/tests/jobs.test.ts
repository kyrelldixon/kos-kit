import { describe, expect, mock, test } from "bun:test";
import type { ApiClient } from "../src/lib/api";
import { handleList, handleCreate, buildCreateBody } from "../src/commands/jobs";

function mockClient(overrides: Partial<ApiClient> = {}): ApiClient {
	return {
		get: mock(async () => ({ status: 200, data: [] })),
		post: mock(async () => ({ status: 201, data: {} })),
		patch: mock(async () => ({ status: 200, data: {} })),
		del: mock(async () => ({ status: 204, data: null })),
		...overrides,
	};
}

describe("jobs list", () => {
	test("returns empty list", async () => {
		const client = mockClient();
		const result = await handleList(client);
		expect(result.ok).toBe(true);
		expect(result.result).toEqual([]);
	});

	test("returns jobs with next_actions populated", async () => {
		const jobs = [
			{ name: "water-reminder", disabled: false },
			{ name: "daily-summary", disabled: true },
		];
		const client = mockClient({
			get: mock(async () => ({ status: 200, data: jobs })),
		});
		const result = await handleList(client);
		expect(result.ok).toBe(true);
		expect(result.result).toEqual(jobs);
		if (result.ok) {
			// next_actions should reference actual job names
			const deleteAction = result.next_actions.find((a) =>
				a.command.includes("delete"),
			);
			expect(deleteAction?.params?.name?.enum).toContain("water-reminder");
			expect(deleteAction?.params?.name?.enum).toContain("daily-summary");
		}
	});
});

describe("buildCreateBody", () => {
	test("builds periodic script job from flags", () => {
		const body = buildCreateBody("water-reminder", {
			schedule: "periodic",
			seconds: 120,
			type: "script",
			script: "echo drink water",
			channel: "C123",
			thread: "1234.5",
		});
		expect(body).toEqual({
			name: "water-reminder",
			schedule: { type: "periodic", seconds: 120 },
			execution: { type: "script", script: "echo drink water" },
			destination: { chatId: "C123", threadId: "1234.5" },
		});
	});

	test("builds scheduled agent job from flags", () => {
		const body = buildCreateBody("daily-summary", {
			schedule: "scheduled",
			hour: 9,
			minute: 0,
			type: "agent",
			prompt: "Summarize activity",
			channel: "C123",
		});
		expect(body).toEqual({
			name: "daily-summary",
			schedule: {
				type: "scheduled",
				calendar: { Hour: 9, Minute: 0 },
			},
			execution: { type: "agent", prompt: "Summarize activity" },
			destination: { chatId: "C123" },
		});
	});

	test("maps all calendar flags to PascalCase", () => {
		const body = buildCreateBody("full-calendar", {
			schedule: "scheduled",
			hour: 9,
			minute: 30,
			day: 15,
			weekday: 1,
			month: 3,
			type: "agent",
			prompt: "test",
			channel: "C123",
		});
		expect(body.schedule).toEqual({
			type: "scheduled",
			calendar: { Hour: 9, Minute: 30, Day: 15, Weekday: 1, Month: 3 },
		});
	});

	test("rejects --script with --type agent", () => {
		expect(() =>
			buildCreateBody("bad", {
				schedule: "periodic",
				seconds: 60,
				type: "agent",
				script: "echo hello",
				prompt: "test",
				channel: "C123",
			}),
		).toThrow();
	});

	test("rejects --prompt with --type script", () => {
		expect(() =>
			buildCreateBody("bad", {
				schedule: "periodic",
				seconds: 60,
				type: "script",
				script: "echo hello",
				prompt: "test",
				channel: "C123",
			}),
		).toThrow();
	});

	test("requires --script for script jobs", () => {
		expect(() =>
			buildCreateBody("bad", {
				schedule: "periodic",
				seconds: 60,
				type: "script",
				channel: "C123",
			}),
		).toThrow();
	});

	test("requires --prompt for agent jobs", () => {
		expect(() =>
			buildCreateBody("bad", {
				schedule: "periodic",
				seconds: 60,
				type: "agent",
				channel: "C123",
			}),
		).toThrow();
	});

	test("script with newlines survives flag round trip", () => {
		const body = buildCreateBody("test", {
			schedule: "periodic",
			seconds: 60,
			type: "script",
			script: "#!/bin/bash\necho hello\necho world",
			channel: "C123",
		});
		expect(body.execution.script).toBe("#!/bin/bash\necho hello\necho world");
	});

	test("script with quotes survives flag round trip", () => {
		const body = buildCreateBody("test", {
			schedule: "periodic",
			seconds: 60,
			type: "script",
			script: '#!/bin/bash\necho "hello world"',
			channel: "C123",
		});
		expect(body.execution.script).toBe('#!/bin/bash\necho "hello world"');
	});
});

describe("buildCreateBody --json mode", () => {
	test("parses raw JSON and injects name", () => {
		const json = '{"schedule":{"type":"periodic","seconds":60},"execution":{"type":"script","script":"echo hi"},"destination":{"chatId":"C123"}}';
		const body = buildCreateBody("my-job", { json });
		expect(body.name).toBe("my-job");
		expect(body.schedule).toEqual({ type: "periodic", seconds: 60 });
	});

	test("positional name overrides name in JSON", () => {
		const json = '{"name":"wrong","schedule":{"type":"periodic","seconds":60},"execution":{"type":"script","script":"echo hi"},"destination":{"chatId":"C123"}}';
		const body = buildCreateBody("correct-name", { json });
		expect(body.name).toBe("correct-name");
	});
});

describe("jobs create", () => {
	test("returns success envelope on 201", async () => {
		const created = {
			name: "test-job",
			schedule: { type: "periodic", seconds: 60 },
			execution: { type: "script" },
			destination: { chatId: "C123" },
			disabled: false,
			createdAt: "2026-03-16T00:00:00Z",
			updatedAt: "2026-03-16T00:00:00Z",
		};
		const client = mockClient({
			post: mock(async () => ({ status: 201, data: created })),
		});
		const body = {
			name: "test-job",
			schedule: { type: "periodic" as const, seconds: 60 },
			execution: { type: "script" as const, script: "echo hi" },
			destination: { chatId: "C123" },
		};
		const result = await handleCreate(client, "test-job", body);
		expect(result.ok).toBe(true);
		expect(result.result).toEqual(created);
	});

	test("returns CONFLICT on 409", async () => {
		const client = mockClient({
			post: mock(async () => ({
				status: 409,
				data: { error: "Job 'test-job' already exists" },
			})),
		});
		const body = {
			name: "test-job",
			schedule: { type: "periodic" as const, seconds: 60 },
			execution: { type: "script" as const, script: "echo hi" },
			destination: { chatId: "C123" },
		};
		const result = await handleCreate(client, "test-job", body);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("CONFLICT");
		}
	});
});
