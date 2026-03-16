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

// --- Create body builder (exported for testing) ---

interface CreateFlags {
	schedule?: string;
	seconds?: number;
	hour?: number;
	minute?: number;
	day?: number;
	weekday?: number;
	month?: number;
	type?: string;
	script?: string;
	prompt?: string;
	channel?: string;
	thread?: string;
	json?: string;
}

export function buildCreateBody(name: string, flags: CreateFlags): any {
	// JSON mode — parse and inject name
	if (flags.json) {
		try {
			const parsed = JSON.parse(flags.json);
			return { ...parsed, name };
		} catch {
			throw new ValidationError(
				"Invalid JSON in --json flag",
				"Ensure --json value is valid JSON. Example: --json '{\"schedule\":{\"type\":\"periodic\",\"seconds\":60},...}'",
			);
		}
	}

	// Flag mode — validate and build
	if (!flags.schedule)
		throw new ValidationError("--schedule is required", "Add --schedule periodic or --schedule scheduled");
	if (!flags.type)
		throw new ValidationError("--type is required", "Add --type script or --type agent");
	if (!flags.channel)
		throw new ValidationError("--channel is required", "Add --channel <slack-channel-id>");

	// Cross-validate execution flags
	if (flags.type === "script" && flags.prompt) {
		throw new ValidationError("--prompt cannot be used with --type script", "Remove --prompt or change to --type agent");
	}
	if (flags.type === "agent" && flags.script) {
		throw new ValidationError("--script cannot be used with --type agent", "Remove --script or change to --type script");
	}
	if (flags.type === "script" && !flags.script) {
		throw new ValidationError("--script is required for script jobs", 'Add --script "<your script content>"');
	}
	if (flags.type === "agent" && !flags.prompt) {
		throw new ValidationError("--prompt is required for agent jobs", 'Add --prompt "<what the agent should do>"');
	}

	// Build schedule
	let schedule: Record<string, unknown>;
	if (flags.schedule === "periodic") {
		if (!flags.seconds) throw new ValidationError("--seconds is required for periodic schedule", "Add --seconds <N>");
		schedule = { type: "periodic", seconds: flags.seconds };
	} else if (flags.schedule === "scheduled") {
		const calendar: Record<string, number> = {};
		if (flags.hour !== undefined) calendar.Hour = flags.hour;
		if (flags.minute !== undefined) calendar.Minute = flags.minute;
		if (flags.day !== undefined) calendar.Day = flags.day;
		if (flags.weekday !== undefined) calendar.Weekday = flags.weekday;
		if (flags.month !== undefined) calendar.Month = flags.month;
		schedule = { type: "scheduled", calendar };
	} else {
		throw new ValidationError(`Invalid schedule type: ${flags.schedule}`, "Use --schedule periodic or --schedule scheduled");
	}

	// Build execution
	const execution: Record<string, unknown> =
		flags.type === "script"
			? { type: "script", script: flags.script }
			: { type: "agent", prompt: flags.prompt };

	// Build destination
	const destination: Record<string, string> = { chatId: flags.channel };
	if (flags.thread) destination.threadId = flags.thread;

	return { name, schedule, execution, destination };
}

export async function handleCreate(
	client: ApiClient,
	name: string,
	body: unknown,
): Promise<CLIResponse> {
	const res = await client.post("/api/jobs", body);

	if (res.status === 409) {
		const data = res.data as { error?: string };
		return error(
			`kos jobs create ${name}`,
			"CONFLICT",
			data.error ?? `Job '${name}' already exists`,
			`Choose a different name or delete the existing job: kos jobs delete ${name}`,
			[
				{
					command: `kos jobs delete ${name}`,
					description: "Delete existing job first",
				},
			],
		);
	}

	if (res.status === 400) {
		const data = res.data as { error?: string; details?: unknown };
		const msg = data.error ?? "Validation failed";
		const details = data.details
			? `: ${JSON.stringify(data.details)}`
			: "";
		return error(
			`kos jobs create ${name}`,
			"VALIDATION_ERROR",
			`${msg}${details}`,
			"Check flag values match the expected schema",
			[],
		);
	}

	if (res.status !== 201) {
		return error(
			`kos jobs create ${name}`,
			"API_ERROR",
			`Unexpected status ${res.status}`,
			"Check the server logs",
			[],
		);
	}

	return success(`kos jobs create ${name}`, res.data, [
		{ command: "kos jobs list", description: "List all jobs" },
		{
			command: `kos jobs delete ${name}`,
			description: "Delete this job",
		},
	]);
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

const createCommand = defineCommand({
	meta: { name: "create", description: "Create a scheduled job" },
	args: {
		name: { type: "positional", description: "Job name", required: true },
		schedule: { type: "string", description: "Schedule type: periodic | scheduled" },
		seconds: { type: "string", description: "Interval in seconds (periodic)" },
		hour: { type: "string", description: "Hour 0-23 (scheduled)" },
		minute: { type: "string", description: "Minute 0-59 (scheduled)" },
		day: { type: "string", description: "Day 1-31 (scheduled)" },
		weekday: { type: "string", description: "Weekday 0-6, Sunday=0 (scheduled)" },
		month: { type: "string", description: "Month 1-12 (scheduled)" },
		type: { type: "string", description: "Execution type: script | agent" },
		script: { type: "string", description: "Script content (script jobs)" },
		prompt: { type: "string", description: "Agent prompt (agent jobs)" },
		channel: { type: "string", description: "Slack channel ID" },
		thread: { type: "string", description: "Slack thread ID" },
		json: { type: "string", description: "Raw JSON body (overrides other flags)" },
	},
	async run({ args }) {
		const cmd = `kos jobs create ${args.name}`;
		try {
			const body = buildCreateBody(args.name, {
				...args,
				seconds: args.seconds ? Number(args.seconds) : undefined,
				hour: args.hour ? Number(args.hour) : undefined,
				minute: args.minute ? Number(args.minute) : undefined,
				day: args.day ? Number(args.day) : undefined,
				weekday: args.weekday ? Number(args.weekday) : undefined,
				month: args.month ? Number(args.month) : undefined,
			});
			const client = await getClient();
			output(await handleCreate(client, args.name, body));
		} catch (e) {
			outputError(cmd, e);
		}
	},
});

// --- Main export ---

export const jobsCommand = defineCommand({
	meta: { name: "jobs", description: "Manage scheduled jobs" },
	subCommands: {
		list: listCommand,
		create: createCommand,
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
