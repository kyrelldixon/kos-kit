import { describe, expect, test } from "bun:test";
import { getLinearClient, initLinearClient } from "../src/lib/linear";

describe("Linear client", () => {
	test("initializes client with API key", () => {
		const client = initLinearClient("lin_test_key");
		expect(client).toBeDefined();
	});

	test("getLinearClient returns initialized client", () => {
		initLinearClient("lin_test_key");
		const client = getLinearClient();
		expect(client).toBeDefined();
	});
});
