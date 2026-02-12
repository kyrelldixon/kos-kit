import { LinearClient } from "@linear/sdk";

let client: LinearClient | null = null;

export function initLinearClient(apiKey: string): LinearClient {
	client = new LinearClient({ apiKey });
	return client;
}

export function getLinearClient(): LinearClient {
	if (!client) {
		throw new Error(
			"Linear client not initialized. Call initLinearClient first.",
		);
	}
	return client;
}
