import { describe, expect, mock, test } from "bun:test";
import type { ApiClient } from "../src/lib/api";
import { handleList } from "../src/commands/jobs";

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
