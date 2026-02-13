import { describe, expect, test } from "bun:test";
import { resolveProjectId } from "../src/lib/resolvers";
import type { LinearClient } from "@linear/sdk";

function mockClient(projects: Array<{ id: string; name: string }>) {
	return {
		projects: () =>
			Promise.resolve({
				nodes: projects,
			}),
	} as unknown as LinearClient;
}

const testProjects = [
	{ id: "uuid-1", name: "Agent Infrastructure MVP" },
	{ id: "uuid-2", name: "kos-kit" },
];

describe("resolveProjectId", () => {
	test("resolves project name to ID", async () => {
		const client = mockClient(testProjects);
		const id = await resolveProjectId(client, "Agent Infrastructure MVP");
		expect(id).toBe("uuid-1");
	});

	test("resolves case-insensitively", async () => {
		const client = mockClient(testProjects);
		const id = await resolveProjectId(client, "agent infrastructure mvp");
		expect(id).toBe("uuid-1");
	});

	test("passes through UUID as-is", async () => {
		const client = mockClient(testProjects);
		const id = await resolveProjectId(
			client,
			"2a83e82d-ef91-4a7d-8157-6fb3b06a5bcf",
		);
		expect(id).toBe("2a83e82d-ef91-4a7d-8157-6fb3b06a5bcf");
	});

	test("throws with available projects when not found", async () => {
		const client = mockClient(testProjects);
		expect(resolveProjectId(client, "Nonexistent")).rejects.toThrow(
			/Available:/,
		);
	});
});
