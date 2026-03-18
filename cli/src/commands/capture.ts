import { defineCommand } from "citty";
import { loadConfig } from "../lib/config";
import { createApiClient, ApiError, type ApiClient } from "../lib/api";
import { success, error, output, type CLIResponse } from "../lib/output";

// --- Handlers (exported for testing) ---

interface CaptureOptions {
	urls?: string[];
	filePath?: string;
	mode?: string;
	type?: string;
	title?: string;
	destination?: { chatId: string; threadId?: string };
}

export async function handleCapture(
	client: ApiClient,
	options: CaptureOptions,
): Promise<CLIResponse> {
	const body: Record<string, unknown> = {};

	if (options.filePath) {
		body.filePath = options.filePath;
		if (options.title) body.title = options.title;
	} else if (options.urls) {
		body.urls = options.urls;
		if (options.mode) body.mode = options.mode;
		if (options.type) body.type = options.type;
	}

	if (options.destination) body.destination = options.destination;

	const res = await client.post("/api/capture", body);

	if (res.status === 400) {
		const data = res.data;
		const message =
			typeof data === "object" && data !== null && "error" in data
				? String((data as Record<string, unknown>).error)
				: "Validation failed";
		return error(
			"kos capture",
			"VALIDATION_ERROR",
			message,
			"Check URL format and flags",
			[],
		);
	}

	if (res.status !== 202) {
		return error(
			"kos capture",
			"API_ERROR",
			`Unexpected status ${res.status}`,
			"Check the server logs",
			[],
		);
	}

	return success("kos capture", res.data, [
		{
			command: "kos capture <url> --full",
			description: "Capture with full extraction",
		},
	]);
}

export function parseBatchFile(content: string): string[] {
	return content
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));
}

// --- Main command ---

export const captureCommand = defineCommand({
	meta: { name: "capture", description: "Capture URLs or files into the vault" },
	args: {
		urls: {
			type: "positional",
			description: "URLs to capture",
			required: false,
		},
		full: { type: "boolean", description: "Full extraction mode" },
		quick: { type: "boolean", description: "Quick save mode" },
		type: {
			type: "string",
			description: "Force content type (article, youtube-video, etc.)",
		},
		"batch-file": {
			type: "string",
			description: "File containing URLs (one per line)",
		},
		file: { type: "string", description: "Local file path to capture" },
		title: { type: "string", description: "Title for file captures" },
		channel: {
			type: "string",
			description: "Slack channel ID for notifications",
		},
		thread: {
			type: "string",
			description: "Slack thread timestamp for notifications",
		},
	},
	async run({ args }) {
		const client = await getClient();
		try {
			let urls: string[] | undefined;
			let filePath: string | undefined;

			if (args.file) {
				filePath = args.file;
			} else if (args["batch-file"]) {
				const content = await Bun.file(args["batch-file"]).text();
				urls = parseBatchFile(content);
				if (urls.length === 0) {
					output(
						error(
							"kos capture",
							"VALIDATION_ERROR",
							"No URLs found in batch file",
							"Ensure batch file contains URLs (one per line)",
							[],
						),
					);
				}
			} else if (args.urls) {
				// citty gives positional as string; wrap in array for the API
				urls = [args.urls];
			} else {
				output(
					error(
						"kos capture",
						"VALIDATION_ERROR",
						"No URLs or file provided",
						"Usage: kos capture <url> or kos capture --file <path>",
						[],
					),
				);
			}

			const mode = args.full ? "full" : args.quick ? "quick" : undefined;
			const channel = args.channel ?? process.env.KOS_SLACK_CHANNEL;
			const thread = args.thread ?? process.env.KOS_SLACK_THREAD;
			const destination = channel
				? { chatId: channel, threadId: thread }
				: undefined;

			output(
				await handleCapture(client, {
					urls,
					filePath,
					mode,
					type: args.type,
					title: args.title,
					destination,
				}),
			);
		} catch (e) {
			outputError("kos capture", e);
		}
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
