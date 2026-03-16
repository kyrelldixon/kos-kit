import { defineCommand } from "citty";
import { loadConfig } from "../lib/config";
import { createApiClient, ApiError, type ApiClient } from "../lib/api";
import {
	success,
	error,
	output,
	type CLIResponse,
	type NextAction,
} from "../lib/output";

// --- Handlers (exported for testing) ---

export async function handleList(client: ApiClient): Promise<CLIResponse> {
	const res = await client.get("/api/jobs");
	const jobs = res.data as Array<{ name: string; disabled: boolean }>;
	const names = jobs.map((j) => j.name);

	const actions: NextAction[] = [];
	if (names.length > 0) {
		actions.push(
			{
				command: "kos jobs create <name> --schedule <type> --type <execution>",
				description: "Create a new job",
			},
			{
				command: "kos jobs delete <name>",
				description: "Delete a job",
				params: { name: { enum: names } },
			},
			{
				command: "kos jobs pause <name>",
				description: "Pause a job",
				params: {
					name: {
						enum: jobs.filter((j) => !j.disabled).map((j) => j.name),
					},
				},
			},
			{
				command: "kos jobs resume <name>",
				description: "Resume a paused job",
				params: {
					name: {
						enum: jobs.filter((j) => j.disabled).map((j) => j.name),
					},
				},
			},
		);
	} else {
		actions.push({
			command: "kos jobs create <name> --schedule <type> --type <execution>",
			description: "Create a new job",
		});
	}

	return success("kos jobs list", jobs, actions);
}

// --- Subcommands ---

const listCommand = defineCommand({
	meta: { name: "list", description: "List all scheduled jobs" },
	async run() {
		const client = await getClient();
		try {
			output(await handleList(client));
		} catch (e) {
			outputError("kos jobs list", e);
		}
	},
});

// --- Main export ---

export const jobsCommand = defineCommand({
	meta: { name: "jobs", description: "Manage scheduled jobs" },
	subCommands: {
		list: listCommand,
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
	} else if (e instanceof ValidationError) {
		output(error(command, "VALIDATION_ERROR", e.message, e.fix, []));
	} else {
		output(error(command, "API_ERROR", String(e), "Check the server logs", []));
	}
	// Unreachable — output() calls process.exit()
	process.exit(1);
}

/** Thrown by buildCreateBody for flag validation failures */
class ValidationError extends Error {
	fix: string;
	constructor(message: string, fix: string) {
		super(message);
		this.fix = fix;
	}
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
