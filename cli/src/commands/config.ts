import { defineCommand } from "citty";
import { loadConfig } from "../lib/config";
import { createApiClient, ApiError, type ApiClient } from "../lib/api";
import { success, error, output, type CLIResponse } from "../lib/output";

// --- Handlers (exported for testing) ---

export async function handleList(client: ApiClient): Promise<CLIResponse> {
	const res = await client.get("/api/config");
	if (res.status !== 200) {
		return error("kos config list", "API_ERROR", `Unexpected status ${res.status}`, "Check the server logs or run: kos doctor", []);
	}
	return success("kos config list", res.data, [
		{ command: "kos config set <key> <value>", description: "Update a config value" },
		{ command: "kos config get <key>", description: "Get a specific config value" },
	]);
}

export async function handleGet(client: ApiClient, key: string): Promise<CLIResponse> {
	const res = await client.get("/api/config");
	if (res.status !== 200) {
		return error(`kos config get ${key}`, "API_ERROR", `Unexpected status ${res.status}`, "Check the server logs or run: kos doctor", []);
	}
	const config = res.data as Record<string, unknown>;
	const value = config[key];
	if (value === undefined) {
		return error("kos config get", "NOT_FOUND", `Config key '${key}' not found`, "Run kos config list to see available keys", [
			{ command: "kos config list", description: "List all config values" },
		]);
	}
	return success(`kos config get ${key}`, { key, value }, [
		{ command: `kos config set ${key} <value>`, description: `Update ${key}` },
		{ command: "kos config list", description: "List all config values" },
	]);
}

export async function handleSet(client: ApiClient, key: string, value: string): Promise<CLIResponse> {
	const res = await client.patch("/api/config", { [key]: value });
	if (res.status !== 200) {
		return error(`kos config set ${key}`, "API_ERROR", `Unexpected status ${res.status}`, "Check the server logs or run: kos doctor", []);
	}
	return success(`kos config set ${key}`, res.data, [
		{ command: "kos config list", description: "List all config values" },
		{ command: `kos config get ${key}`, description: `Verify ${key} was updated` },
	]);
}

// --- Subcommands ---

const listCommand = defineCommand({
	meta: { name: "list", description: "List all config values" },
	async run() {
		const client = await getClient();
		try {
			output(await handleList(client));
		} catch (e) {
			outputError("kos config list", e);
		}
	},
});

const getCommand = defineCommand({
	meta: { name: "get", description: "Get a specific config value" },
	args: {
		key: { type: "positional", description: "Config key", required: true },
	},
	async run({ args }) {
		const client = await getClient();
		try {
			output(await handleGet(client, args.key));
		} catch (e) {
			outputError(`kos config get ${args.key}`, e);
		}
	},
});

const setCommand = defineCommand({
	meta: { name: "set", description: "Set a config value" },
	args: {
		key: { type: "positional", description: "Config key", required: true },
		value: { type: "positional", description: "Config value", required: true },
	},
	async run({ args }) {
		const client = await getClient();
		try {
			output(await handleSet(client, args.key, args.value));
		} catch (e) {
			outputError(`kos config set ${args.key}`, e);
		}
	},
});

// --- Main export ---

export const configCommand = defineCommand({
	meta: { name: "config", description: "Manage kos-agent configuration" },
	subCommands: {
		list: listCommand,
		get: getCommand,
		set: setCommand,
	},
});

// --- Helpers ---

async function getClient(): Promise<ApiClient> {
	const config = await loadConfig();
	const apiUrl = config.api_url ?? "https://kos.kyrelldixon.com";
	return createApiClient(apiUrl);
}

function outputError(command: string, e: unknown): never {
	if (e instanceof ApiError) {
		output(error(command, e.code, e.message, getFix(e.code), []));
	} else {
		output(error(command, "API_ERROR", String(e), "Check the server logs", []));
	}
	process.exit(1);
}

function getFix(code: string): string {
	switch (code) {
		case "CONNECTION_ERROR":
			return "Is the kos-agent server running? Check: curl http://localhost:9080/health";
		case "AUTH_ERROR":
			return "Unlock 1Password or run: op signin";
		default:
			return "Check the server logs";
	}
}
